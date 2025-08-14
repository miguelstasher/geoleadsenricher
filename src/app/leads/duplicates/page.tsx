"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useNotifications } from '../../components/SimpleNotificationProvider';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Lead = {
  id: string;
  name: string;
  website: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  poi: string;
  business_type: string;
  facebook_url: string;
  linkedin_url: string;
  location: string;
  address: string;
  created_at: string;
  record_owner: string;
  email: string;
  email_status: string;
  last_modified: string;
  bounce_host: string;
  campaign: string;
  campaign_status: string;
  currency: string;
  chain: string;
};

type DuplicateGroup = {
  name: string;
  leads: Lead[];
  keepLead: Lead | null;
  duplicateLeads: Lead[];
};

export default function DuplicatesPage() {
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [totalDuplicates, setTotalDuplicates] = useState(0);

  // Function to truncate website URLs for better display
  const truncateWebsite = (url: string) => {
    if (!url) return '';
    
    try {
      let cleaned = url.replace(/^(https?:\/\/)?(www\.)?/i, '');
      const parts = cleaned.split('/');
      const domain = parts[0];
      
      if (parts.length === 1) {
        if (domain.length > 20) {
          return domain.substring(0, 17) + '...';
        }
        return domain;
      }
      
      if (domain.length > 15) {
        return domain.substring(0, 12) + '.../...';
      }
      
      return domain + '/...';
    } catch (error) {
      let cleaned = url.replace(/^(https?:\/\/)?(www\.)?/i, '');
      if (cleaned.length > 20) {
        return cleaned.substring(0, 17) + '...';
      }
      return cleaned;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const findDuplicates = async () => {
    try {
      setLoading(true);
      
      // Fetch all leads
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!leads || leads.length === 0) {
        setDuplicateGroups([]);
        setTotalDuplicates(0);
        return;
      }

      // Group leads by name (case-insensitive)
      const groupedByName: { [key: string]: Lead[] } = {};
      
      leads.forEach(lead => {
        const normalizedName = lead.name.toLowerCase().trim();
        if (!groupedByName[normalizedName]) {
          groupedByName[normalizedName] = [];
        }
        groupedByName[normalizedName].push(lead);
      });

      // Find groups with duplicates (more than 1 lead)
      const duplicates: DuplicateGroup[] = [];
      let totalDuplicateCount = 0;

      Object.entries(groupedByName).forEach(([name, leadsInGroup]) => {
        if (leadsInGroup.length > 1) {
          // Sort leads: those with email first, then by creation date (newest first)
          const sortedLeads = leadsInGroup.sort((a, b) => {
            // First priority: has email
            const aHasEmail = a.email && a.email.trim() !== '';
            const bHasEmail = b.email && b.email.trim() !== '';
            
            if (aHasEmail && !bHasEmail) return -1;
            if (!aHasEmail && bHasEmail) return 1;
            
            // Second priority: creation date (newer first)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          const keepLead = sortedLeads[0]; // The one to keep
          const duplicateLeads = sortedLeads.slice(1); // The ones to potentially delete

          duplicates.push({
            name: leadsInGroup[0].name, // Use original name (not normalized)
            leads: leadsInGroup,
            keepLead,
            duplicateLeads
          });

          totalDuplicateCount += duplicateLeads.length;
        }
      });

      setDuplicateGroups(duplicates);
      setTotalDuplicates(totalDuplicateCount);

    } catch (error) {
      console.error('Error finding duplicates:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to find duplicates',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    findDuplicates();
  }, []);

  const handleGroupSelect = (name: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedGroups(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedGroups.size === duplicateGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(duplicateGroups.map(group => group.name)));
    }
  };

  const handleDeleteDuplicates = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteDuplicates = async () => {
    try {
      const groupsToDelete = selectedGroups.size > 0 
        ? duplicateGroups.filter(group => selectedGroups.has(group.name))
        : duplicateGroups;

      const leadIdsToDelete: string[] = [];
      groupsToDelete.forEach(group => {
        leadIdsToDelete.push(...group.duplicateLeads.map(lead => lead.id));
      });

      if (leadIdsToDelete.length === 0) {
        addNotification({
          title: 'No Duplicates',
          message: 'No duplicate leads to delete',
          type: 'info'
        });
        setShowDeleteModal(false);
        return;
      }

      // Delete from Supabase
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIdsToDelete);

      if (error) {
        throw error;
      }

      addNotification({
        title: 'Success',
        message: `Deleted ${leadIdsToDelete.length} duplicate leads`,
        type: 'success'
      });

      setShowDeleteModal(false);
      setSelectedGroups(new Set());
      
      // Refresh the duplicates list
      await findDuplicates();

    } catch (error) {
      console.error('Error deleting duplicates:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to delete duplicate leads',
        type: 'error'
      });
    }
  };

  const handleDeleteSingleDuplicate = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      addNotification({
        title: 'Success',
        message: 'Duplicate lead deleted',
        type: 'success'
      });

      // Refresh the duplicates list
      await findDuplicates();

    } catch (error) {
      console.error('Error deleting lead:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to delete lead',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Duplicate Detection</h1>
          <Link href="/leads" className="text-blue-600 hover:underline">
            Back to Leads
          </Link>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Duplicate Detection</h1>
        <Link href="/leads" className="text-blue-600 hover:underline">
          Back to Leads
        </Link>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{duplicateGroups.length}</div>
            <div className="text-sm text-gray-600">Duplicate Groups</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{totalDuplicates}</div>
            <div className="text-sm text-gray-600">Total Duplicates</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {duplicateGroups.reduce((sum, group) => sum + 1, 0)}
            </div>
            <div className="text-sm text-gray-600">Leads to Keep</div>
          </div>
        </div>
      </div>

      {duplicateGroups.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Duplicates Found!</h2>
          <p className="text-gray-600">Your leads database is clean - no duplicate entries detected.</p>
          <Link 
            href="/leads" 
            className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Leads
          </Link>
        </div>
      ) : (
        <>
          {/* Actions Bar */}
          <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedGroups.size === duplicateGroups.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-600">
                {selectedGroups.size} of {duplicateGroups.length} groups selected
              </span>
            </div>
            <button
              onClick={handleDeleteDuplicates}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete {selectedGroups.size > 0 ? 'Selected' : 'All'} Duplicates</span>
            </button>
          </div>

          {/* Duplicate Groups */}
          <div className="space-y-4">
            {duplicateGroups.map((group) => (
              <div key={group.name} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(group.name)}
                      onChange={() => handleGroupSelect(group.name)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                      {group.duplicateLeads.length} duplicate{group.duplicateLeads.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Website
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Lead to Keep */}
                      {group.keepLead && (
                        <tr className="bg-green-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Keep
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">{group.keepLead.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {group.keepLead.email || <span className="text-gray-400 italic">No email</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{group.keepLead.phone}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {group.keepLead.website ? (
                              <a 
                                href={group.keepLead.website.startsWith('http') ? group.keepLead.website : `https://${group.keepLead.website}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {truncateWebsite(group.keepLead.website)}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">No website</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{formatDate(group.keepLead.created_at)}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <span className="text-green-600 font-medium">Will be kept</span>
                          </td>
                        </tr>
                      )}

                      {/* Duplicate Leads */}
                      {group.duplicateLeads.map((lead) => (
                        <tr key={lead.id} className="bg-red-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Duplicate
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">{lead.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {lead.email || <span className="text-gray-400 italic">No email</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{lead.phone}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {lead.website ? (
                              <a 
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {truncateWebsite(lead.website)}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">No website</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{formatDate(lead.created_at)}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDeleteSingleDuplicate(lead.id)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Delete Duplicates</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {selectedGroups.size > 0 
                    ? `This will delete ${selectedGroups.size} duplicate groups. The leads with emails will be preserved.`
                    : `This will delete all ${totalDuplicates} duplicate leads. The leads with emails will be preserved.`
                  }
                </p>
                <p className="text-sm text-red-600 mt-2 font-medium">
                  This action cannot be undone.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={confirmDeleteDuplicates}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  Delete Duplicates
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
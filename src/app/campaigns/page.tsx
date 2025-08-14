"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, live, archived
  const [sendingLeads, setSendingLeads] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [syncingCampaigns, setSyncingCampaigns] = useState(false);

  // Fetch campaigns from API
  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/campaigns');
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      
      const data = await response.json();
      setCampaigns(data);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSendLeads = async (campaignId: string, campaignName: string) => {
    setSendingLeads(campaignId);
    
    try {
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          campaignName
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send leads');
      }

      // Show success message
      setToastMessage(`Successfully sent ${result.updatedCount} leads to Instantly for "${campaignName}"`);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);

      // Refresh campaigns data to update counts
      await fetchCampaigns();

    } catch (error: any) {
      console.error('Error sending leads:', error);
      setToastMessage('Error sending leads: ' + (error.message || 'Unknown error'));
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
    } finally {
      setSendingLeads(null);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 5000);
  };

  const syncCampaigns = async () => {
    try {
      setSyncingCampaigns(true);
      
      const response = await fetch('/api/campaigns/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync campaigns');
      }

      // Refresh the campaigns list
      await fetchCampaigns();
      
      // Show success message with stats
      const stats = data.stats;
      const messages = [];
      if (stats.added > 0) messages.push(`${stats.added} added`);
      if (stats.updated > 0) messages.push(`${stats.updated} updated`);
      if (stats.deleted > 0) messages.push(`${stats.deleted} archived`);
      
      const message = messages.length > 0 
        ? `✅ Campaigns synced: ${messages.join(', ')}`
        : '✅ Campaigns synced - no changes needed';
      
      showToast(message);
    } catch (err: any) {
      console.error('Error syncing campaigns:', err);
      showToast(`❌ Failed to sync campaigns: ${err.message}`);
    } finally {
      setSyncingCampaigns(false);
    }
  };

  // Filter campaigns based on search term and status filter
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'live' && campaign.status === 'Live') ||
      (statusFilter === 'archived' && campaign.status === 'Deleted');
    
    return matchesSearch && matchesStatus;
  });

  // Get campaign counts for filter labels
  const liveCampaignsCount = campaigns.filter(c => c.status === 'Live').length;
  const archivedCampaignsCount = campaigns.filter(c => c.status === 'Deleted').length;

  const Toast = () => {
    if (!isToastVisible) return null;
    
    return (
      <div className="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{toastMessage}</p>
          </div>
          <div className="ml-auto pl-3">
            <button
              onClick={() => setIsToastVisible(false)}
              className="inline-flex text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Toast />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Email Campaigns</h1>
        <button 
          onClick={syncCampaigns}
          disabled={loading || syncingCampaigns}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {syncingCampaigns && (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <span>{syncingCampaigns ? 'Syncing from Instantly...' : 'Update Campaign List'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading campaigns</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button 
                onClick={fetchCampaigns}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold">All Campaigns</h2>
            <p className="text-sm text-gray-600">
              Total: {campaigns.length} | Live: {liveCampaignsCount} | Archived: {archivedCampaignsCount}
            </p>
          </div>
          <div className="flex space-x-4">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Campaigns ({campaigns.length})</option>
              <option value="live">Live ({liveCampaignsCount})</option>
              <option value="archived">Archived ({archivedCampaignsCount})</option>
            </select>
            
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                className="border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-8"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading campaigns...</p>
          </div>
        ) : filteredCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacts in Campaign
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign Link
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.map((campaign) => {
                  const isSending = sendingLeads === campaign.id;
                  const isLive = campaign.status === 'Live';
                  const isArchived = campaign.status === 'Deleted';
                  
                  return (
                    <tr key={campaign.id} className={isArchived ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-medium ${isArchived ? 'text-red-700' : 'text-gray-900'}`}>
                          {campaign.name}
                        </span>
                        <p className="text-xs text-gray-500">ID: {campaign.id}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          isLive 
                            ? 'bg-green-100 text-green-800' 
                            : isArchived
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isArchived ? 'Archived' : campaign.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="font-medium text-blue-600">{campaign.contactsInCampaign || 0}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(campaign.last_updated).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {campaign.instantly_id ? (
                          <a
                            href={`https://app.instantly.ai/app/campaign/${campaign.instantly_id}/analytics`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                              isLive 
                                ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            }`}
                            onClick={isArchived ? (e) => e.preventDefault() : undefined}
                            title={isArchived ? 'Campaign is archived and may not be accessible' : 'Open in Instantly'}
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {isArchived ? 'Archived' : 'View in Instantly'}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">No link available</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleSendLeads(campaign.id, campaign.name)}
                          disabled={isSending || isArchived}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            !isSending && isLive
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                          title={isArchived ? 'Cannot send leads to archived campaigns' : 'Send leads to this campaign'}
                        >
                          {isSending ? 'Sending...' : 'Send Leads'}
                        </button>
                        <Link 
                          href={`/campaigns/${campaign.id}`}
                          className={`${isArchived ? 'text-red-600 hover:text-red-900' : 'text-indigo-600 hover:text-indigo-900'}`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">
              {statusFilter === 'all' ? 'No campaigns found.' : 
               statusFilter === 'live' ? 'No live campaigns found.' : 
               'No archived campaigns found.'}
            </p>
          </div>
        )}
      </div>
      
      <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
        <h2 className="text-lg font-semibold text-indigo-800 mb-2">Campaign Integration</h2>
        <p className="text-indigo-700 mb-4">
          This tool integrates with Instantly to manage your email campaigns:
        </p>
        <ul className="list-disc pl-5 text-indigo-700 space-y-2">
          <li>Your Instantly campaigns will automatically sync here</li>
          <li><strong>Live campaigns</strong> appear with green status badges</li>
          <li><strong>Archived campaigns</strong> are campaigns deleted from Instantly (red status)</li>
          <li>Select leads from your database and send them directly to live campaigns</li>
          <li>Track which leads have been sent to which campaigns</li>
          <li>Use the filter to view Live, Archived, or All campaigns</li>
        </ul>
      </div>
    </div>
  );
} 
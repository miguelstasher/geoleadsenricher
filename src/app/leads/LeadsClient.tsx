'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import CustomFilter from '../components/CustomFilter';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNotifications } from '../components/SimpleNotificationProvider';
import EnrichmentNotification from '../components/EnrichmentNotification';
import { useSearchParams } from 'next/navigation';
import RecordOwnerDisplay from '../components/RecordOwnerDisplay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define the Lead type - updated to match Supabase table structure
type Lead = {
  id: string;
  name: string;
  website: string;
  phone: string;
  country: string;
  city: string;
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

export default function LeadsClient() {
  // Initialize leads with empty array
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get URL search parameters
  const searchParams = useSearchParams();
  
  // State for chain entries loaded from localStorage
  const [chainEntries, setChainEntries] = useState<{name: string, domain: string}[]>([]);
  
  // Load leads from Supabase
  useEffect(() => {
    fetchLeads();
  }, []);

  // Load chain entries from localStorage
  useEffect(() => {
    try {
      const savedChainEntries = localStorage.getItem('chainEntries');
      if (savedChainEntries) {
        setChainEntries(JSON.parse(savedChainEntries));
      }
    } catch (error) {
      console.error('Error loading chain entries:', error);
    }
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setLeads(data || []);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle URL parameters for email status filtering (from dashboard analytics)
  useEffect(() => {
    const emailStatusParam = searchParams.get('emailStatus');
    if (emailStatusParam) {
      // Use the URL parameter directly since it now matches database values
      setEmailStatusFilter(emailStatusParam);
    }
  }, [searchParams]);

  // Save leads to localStorage whenever they change
  useEffect(() => {
    if (leads.length > 0) {
      localStorage.setItem('leads', JSON.stringify(leads));
    }
  }, [leads]);

  // Filter states
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string[]>([]);
  const [emailStatusFilter, setEmailStatusFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [recordOwnerFilter, setRecordOwnerFilter] = useState('');
  const [createdDateFilter, setCreatedDateFilter] = useState<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' });
  const [chainStatusFilter, setChainStatusFilter] = useState<'all' | 'chain' | 'independent'>('all');
  const [customFilters, setCustomFilters] = useState<{field: string, operator: string, value: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-white">
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading leads...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading leads</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button 
                onClick={fetchLeads}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && leads.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding some leads to your database.</p>
        </div>
      )}

      {/* Main content - only show when not loading and no error */}
      {!loading && !error && leads.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="bg-white border-b border-gray-200 pb-3">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900">Business Leads</h1>
              <div className="flex items-center space-x-2">
                <Link 
                  href="/leads/extract" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Extract New Leads
                </Link>
              </div>
            </div>
          </div>

          {/* Filters */}
          <CustomFilter
            leads={leads}
            onFilterChange={(filters) => {
              setLocationFilter(filters.locationFilter);
              setBusinessTypeFilter(filters.businessTypeFilter);
              setEmailStatusFilter(filters.emailStatusFilter);
              setCountryFilter(filters.countryFilter);
              setCampaignFilter(filters.campaignFilter);
              setRecordOwnerFilter(filters.recordOwnerFilter);
              setCreatedDateFilter(filters.createdDateFilter);
              setChainStatusFilter(filters.chainStatusFilter);
              setCustomFilters(filters.customFilters);
              setSearchQuery(filters.searchQuery);
            }}
          />

          {/* Leads count */}
          <div className="text-sm text-gray-600">
            Showing {leads.length} leads
          </div>

          {/* Leads table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {leads.map((lead) => (
                <li key={lead.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lead.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {lead.website} • {lead.city}, {lead.country}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        lead.email_status === 'verified' ? 'bg-green-100 text-green-800' :
                        lead.email_status === 'invalid' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.email_status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

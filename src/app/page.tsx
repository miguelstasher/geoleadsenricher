"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GlobalFilters from './components/GlobalFilters';
import { supabase } from '../lib/supabase';

// Dashboard components
const StatCard = ({ title, value, icon }: { title: string, value: string, icon: string }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </div>
      <div className="bg-blue-50 p-3 rounded-full text-blue-600">
        <span className="text-2xl" title={title}>{icon}</span>
      </div>
    </div>
  </div>
);

const FeatureCard = ({ title, description, icon, linkTo }: { title: string, description: string, icon: string, linkTo: string }) => (
  <Link href={linkTo} className="block group">
    <div className="bg-white p-6 rounded-lg shadow-md h-full hover:shadow-lg transition-all duration-200">
      <div className="flex items-center mb-4">
        <div className="bg-blue-50 p-3 rounded-full text-blue-600 mr-4 group-hover:bg-blue-100 transition-colors duration-200">
          <span className="text-2xl" title={title}>{icon}</span>
        </div>
        <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors duration-200">{title}</h3>
      </div>
      <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-200">{description}</p>
    </div>
  </Link>
);

interface Lead {
  id: string;
  name: string;
  website: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  poi: string;
  businessType: string;
  facebookUrl: string;
  linkedinUrl: string;
  location: string;
  address: string;
  createdDateTime: string;
  createdDate: string;
  recordOwner: string;
  email: string;
  emailStatus: string;
  lastModified: string;
  bounceHost: boolean;
  campaign: string;
  currency: string;
  isChain: boolean;
}

export default function Home() {
  // Load leads from Supabase instead of localStorage
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for chain entries loaded from localStorage (same as leads page)
  const [chainEntries, setChainEntries] = useState<{name: string, domain: string}[]>([]);

  // Load chain entries from localStorage (same logic as leads page)
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

  // Utility function to detect if a lead is part of a chain (same as leads page)
  const detectChainStatus = (website: string, chainEntries: {name: string, domain: string}[]): boolean => {
    if (!website || !chainEntries.length) return false;
    
    // Clean the website URL
    const cleanWebsite = website.toLowerCase()
      .replace(/^https?:\/\//, '')  // Remove protocol
      .replace(/^www\./, '')        // Remove www
      .split('/')[0];               // Get just the domain part
    
    // Check if the cleaned website matches any chain domain
    return chainEntries.some(chain => {
      const chainDomain = chain.domain.toLowerCase().replace(/^www\./, '');
      return cleanWebsite.includes(chainDomain) || chainDomain.includes(cleanWebsite);
    });
  };

  // Function to calculate duplicates (same logic as duplicates page)
  const calculateDuplicates = (leads: Lead[]) => {
    // Group leads by name (case-insensitive)
    const groupedByName: { [key: string]: Lead[] } = {};
    
    leads.forEach(lead => {
      const normalizedName = lead.name.toLowerCase().trim();
      if (!groupedByName[normalizedName]) {
        groupedByName[normalizedName] = [];
      }
      groupedByName[normalizedName].push(lead);
    });

    // Count duplicates (leads in groups with more than 1 lead, excluding the one to keep)
    let totalDuplicates = 0;
    let duplicateGroups = 0;

    Object.values(groupedByName).forEach(leadsInGroup => {
      if (leadsInGroup.length > 1) {
        duplicateGroups++;
        totalDuplicates += leadsInGroup.length - 1; // All but one to keep
      }
    });

    return { totalDuplicates, duplicateGroups };
  };

  // Fetch campaigns data for dashboard stats
  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  // Fetch both leads and campaigns on component mount
  useEffect(() => {
    fetchLeads();
    fetchCampaigns();
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

      // Transform Supabase data to match the interface expected by the dashboard
      const transformedLeads = (data || []).map((lead: any) => ({
        id: lead.id,
        name: lead.name,
        website: lead.website,
        phone: lead.phone,
        country: lead.country,
        city: lead.city,
        area: lead.area,
        poi: lead.poi,
        businessType: lead.business_type,
        facebookUrl: lead.facebook_url,
        linkedinUrl: lead.linkedin_url,
        location: lead.location,
        address: lead.address,
        createdDateTime: lead.created_at,
        createdDate: lead.created_at ? lead.created_at.split('T')[0] : '',
        recordOwner: lead.record_owner,
        email: lead.email,
        emailStatus: lead.email_status,
        lastModified: lead.last_modified,
        bounceHost: lead.bounce_host === 'true',
        campaign: lead.campaign,
        currency: lead.currency,
        isChain: lead.chain === 'true'
      }));

      setLeads(transformedLeads);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      setError(error.message);
      // Fallback to empty array if there's an error
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Add state for statistics including duplicates
  const [stats, setStats] = useState({
    totalLeads: 0,
    // Social Media Enrichment
    linkedinUrls: 0,
    facebookUrls: 0,
    emailAddresses: 0,
    waitingForEnrichment: 0,
    // Website & Enrichment Stats
    leadsWithoutWebsite: 0,
    leadsWithoutWebsiteButWithPhone: 0,
    // Email Status Breakdown
    validEmails: 0,
    invalidEmails: 0,
    notFoundEmails: 0,
    unverifiedEmails: 0,
    // Other stats
    totalChains: 0,
    totalIndependent: 0,
    activeCampaigns: 0,
    totalDuplicates: 0,
    duplicateGroups: 0,
    countries: {} as Record<string, number>
  });
  
  // Calculate dashboard statistics whenever leads change
  useEffect(() => {
    const totalLeads = leads.length;
    
    // Social Media & Contact Enrichment Stats
    const linkedinUrls = leads.filter(lead => 
      lead.linkedinUrl && 
      lead.linkedinUrl.trim() !== '' && 
      lead.linkedinUrl !== 'Not Found'
    ).length;
    
    const facebookUrls = leads.filter(lead => 
      lead.facebookUrl && 
      lead.facebookUrl.trim() !== '' && 
      lead.facebookUrl !== 'Not Found'
    ).length;
    
    const emailAddresses = leads.filter(lead => 
      lead.email && 
      lead.email.trim() !== '' && 
      lead.email !== 'Not Found' &&
      lead.email !== 'not_found'
    ).length;
    
    // Waiting for enrichment: leads that haven't been enriched with email yet
    const waitingForEnrichment = leads.filter(lead => 
      lead.emailStatus?.toLowerCase() === 'unverified' ||
      (lead.email && lead.email.trim() !== '' && lead.email !== 'Not Found' && lead.email !== 'not_found' && 
       (!lead.emailStatus || lead.emailStatus.trim() === ''))
    ).length;
    
    // Email Status Breakdown
    const validEmails = leads.filter(lead => 
      lead.emailStatus?.toLowerCase() === 'verified' || 
      lead.emailStatus?.toLowerCase() === 'valid'
    ).length;
    
    const invalidEmails = leads.filter(lead => 
      lead.emailStatus?.toLowerCase() === 'invalid' || 
      lead.emailStatus?.toLowerCase() === 'bounced'
    ).length;
    
    const notFoundEmails = leads.filter(lead => 
      lead.email === 'Not Found' || 
      lead.email === 'not_found' ||
      lead.emailStatus?.toLowerCase() === 'not_found'
    ).length;
    
    const unverifiedEmails = leads.filter(lead => 
      lead.emailStatus?.toLowerCase() === 'unverified' ||
      (lead.email && lead.email.trim() !== '' && lead.email !== 'Not Found' && lead.email !== 'not_found' && 
       (!lead.emailStatus || lead.emailStatus.trim() === ''))
    ).length;
    
    // Count leads without websites (cannot be enriched)
    const leadsWithoutWebsite = leads.filter(lead => 
      !lead.website || lead.website.trim() === ''
    ).length;
    
    // Count leads without websites but with phone numbers (good for cold calling)
    const leadsWithoutWebsiteButWithPhone = leads.filter(lead => 
      (!lead.website || lead.website.trim() === '') && 
      (lead.phone && lead.phone.trim() !== '')
    ).length;
    
    // Count by different categories using dynamic chain detection (same as leads page)
    const totalChains = leads.filter(lead => detectChainStatus(lead.website, chainEntries)).length;
    const totalIndependent = totalLeads - totalChains;
    
    // Count active campaigns from the campaigns table (Live status)
    const activeCampaigns = campaigns.filter(campaign => campaign.status === 'Live').length;
    
    // Calculate duplicates
    const { totalDuplicates, duplicateGroups } = calculateDuplicates(leads);
    
    // Count by countries for potential visualization
    const countries: Record<string, number> = {};
    leads.forEach(lead => {
      const country = lead.country;
      if (country) {
        countries[country] = (countries[country] || 0) + 1;
      }
    });
    
    setStats({
      totalLeads,
      linkedinUrls,
      facebookUrls,
      emailAddresses,
      waitingForEnrichment,
      leadsWithoutWebsite,
      leadsWithoutWebsiteButWithPhone,
      validEmails,
      invalidEmails,
      notFoundEmails,
      unverifiedEmails,
      totalChains,
      totalIndependent,
      activeCampaigns,
      totalDuplicates,
      duplicateGroups,
      countries
    });
  }, [leads, campaigns, chainEntries]); // Add campaigns dependency
  
  const [formattedDates, setFormattedDates] = useState<{[key: string]: string}>({});
  
  useEffect(() => {
    // Format dates only on the client side
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
    };

    // Format all dates in the component
    const dates: {[key: string]: string} = {};
    // Add your date formatting logic here
    setFormattedDates(dates);
  }, []);

  const [selectedFilters, setSelectedFilters] = useState({
    country: '',
    cities: [] as string[],
    businessTypes: [] as string[],
    emailStatus: '',
    campaign: '',
    recordOwner: '',
    createdDate: { startDate: '', endDate: '' },
    customFilters: [] as { field: string; operator: string; value: string }[]
  });

  // Update the filter handling function
  const handleFilterChange = (filterType: string, value: any) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Update the filtered leads logic
  const filteredLeads = leads.filter((lead: Lead) => {
    // Country filter
    if (selectedFilters.country && lead.country !== selectedFilters.country) {
      return false;
    }

    // Cities filter
    if (selectedFilters.cities.length > 0 && !selectedFilters.cities.includes(lead.city)) {
      return false;
    }

    // Business types filter
    if (selectedFilters.businessTypes.length > 0 && !selectedFilters.businessTypes.includes(lead.businessType)) {
      return false;
    }

    // Email status filter
    if (selectedFilters.emailStatus && lead.emailStatus !== selectedFilters.emailStatus) {
      return false;
    }

    // Campaign filter
    if (selectedFilters.campaign && lead.campaign !== selectedFilters.campaign) {
      return false;
    }

    // Record owner filter
    if (selectedFilters.recordOwner && lead.recordOwner !== selectedFilters.recordOwner) {
      return false;
    }

    // Date range filter
    if (selectedFilters.createdDate.startDate || selectedFilters.createdDate.endDate) {
      const leadDate = new Date(lead.createdDate);
      const startDate = selectedFilters.createdDate.startDate ? new Date(selectedFilters.createdDate.startDate) : null;
      const endDate = selectedFilters.createdDate.endDate ? new Date(selectedFilters.createdDate.endDate) : null;

      // Set end date to end of day if it exists
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      if (startDate && leadDate < startDate) {
        return false;
      }
      if (endDate && leadDate > endDate) {
        return false;
      }
    }

    // Custom filters
    if (selectedFilters.customFilters.length > 0) {
      return selectedFilters.customFilters.every(filter => {
        const fieldValue = lead[filter.field as keyof typeof lead];
        
        switch (filter.operator) {
          case 'contains':
            return String(fieldValue).toLowerCase().includes(filter.value.toLowerCase());
          case 'does_not_contain':
            return !String(fieldValue).toLowerCase().includes(filter.value.toLowerCase());
          case 'is':
            return String(fieldValue).toLowerCase() === filter.value.toLowerCase();
          case 'is_not':
            return String(fieldValue).toLowerCase() !== filter.value.toLowerCase();
          case 'is_empty':
            return !fieldValue || String(fieldValue).trim() === '';
          case 'is_not_empty':
            return fieldValue && String(fieldValue).trim() !== '';
          default:
            return true;
        }
      });
    }

    return true;
  });

  const router = useRouter();

  return (
    <div className="space-y-8">
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading dashboard...</span>
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
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
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

      {/* Main dashboard content - only show when not loading and no error */}
      {!loading && !error && (
        <>
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-8 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome to GeoLeads Enricher</h1>
        <p className="text-xl">
          Your all-in-one platform for finding, enriching, and contacting business leads from Google Maps
        </p>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Total Leads" 
            value={stats.totalLeads.toString()} 
            icon="🔍"
          />
          <StatCard 
            title="Active Campaigns" 
            value={stats.activeCampaigns.toString()} 
            icon="📊"
          />
          <StatCard 
            title="Duplicate Leads" 
            value={stats.totalDuplicates.toString()} 
            icon="🔗"
          />
          <StatCard 
            title="Waiting for Enrichment" 
            value={stats.waitingForEnrichment.toString()} 
            icon="⏳"
          />
        </div>
      </div>

      {/* New metric for leads without websites */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-700">Cannot Be Enriched</h3>
          <div className="bg-orange-50 p-2 rounded-full">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
        <div className="text-3xl font-bold text-orange-500 mb-2">{stats.leadsWithoutWebsite}</div>
        <div className="text-sm text-gray-500 mb-3">
          {stats.totalLeads > 0 ? Math.round((stats.leadsWithoutWebsite / stats.totalLeads) * 100) : 0}% of all leads lack websites
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">{stats.leadsWithoutWebsiteButWithPhone}</span> have phone numbers for cold calling
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Enrichment Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">LinkedIn Profiles</h3>
              <div className="bg-blue-50 p-2 rounded-full">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">{stats.linkedinUrls}</div>
            <div className="text-sm text-gray-500">
              {stats.totalLeads > 0 ? Math.round((stats.linkedinUrls / stats.totalLeads) * 100) : 0}% of all leads
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-400">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Facebook Pages</h3>
              <div className="bg-blue-50 p-2 rounded-full">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-500 mb-2">{stats.facebookUrls}</div>
            <div className="text-sm text-gray-500">
              {stats.totalLeads > 0 ? Math.round((stats.facebookUrls / stats.totalLeads) * 100) : 0}% of all leads
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Email Addresses</h3>
              <div className="bg-green-50 p-2 rounded-full">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">{stats.emailAddresses}</div>
            <div className="text-sm text-gray-500">
              {stats.totalLeads > 0 ? Math.round((stats.emailAddresses / stats.totalLeads) * 100) : 0}% of all leads
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Email Status Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500 cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={() => router.push(`/leads?emailStatus=${encodeURIComponent('verified')}`)}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Valid Emails</h3>
              <div className="bg-green-50 p-2 rounded-full">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">{stats.validEmails}</div>
            <div className="text-sm text-gray-500">Verified & deliverable</div>
            <div className="mt-3 text-xs text-green-600 font-medium">Click to view & download</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500 cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={() => router.push(`/leads?emailStatus=${encodeURIComponent('invalid')}`)}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Invalid Emails</h3>
              <div className="bg-red-50 p-2 rounded-full">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-red-600 mb-2">{stats.invalidEmails}</div>
            <div className="text-sm text-gray-500">Bounced or invalid</div>
            <div className="mt-3 text-xs text-red-600 font-medium">Click to view & download</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-500 cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={() => router.push(`/leads?emailStatus=${encodeURIComponent('not_found')}`)}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Not Found</h3>
              <div className="bg-gray-50 p-2 rounded-full">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47.901-6.06 2.369l-.24-.24A9.93 9.93 0 014.18 15.82L2.93 14.57A11.952 11.952 0 0112 2c6.627 0 12 5.373 12 12a11.95 11.95 0 01-2.368 7.175l-.175.175z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-600 mb-2">{stats.notFoundEmails}</div>
            <div className="text-sm text-gray-500">No email discovered</div>
            <div className="mt-3 text-xs text-gray-600 font-medium">Click to view & download</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500 cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={() => router.push(`/leads?emailStatus=${encodeURIComponent('unverified')}`)}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Unverified</h3>
              <div className="bg-yellow-50 p-2 rounded-full">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0l-6.928 12.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.unverifiedEmails}</div>
            <div className="text-sm text-gray-500">Needs verification</div>
            <div className="mt-3 text-xs text-yellow-600 font-medium">Click to view & download</div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Lead Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Chain vs Independent</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Chain Properties</span>
              <span className="text-sm font-medium">{stats.totalChains} leads</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${stats.totalLeads > 0 ? (stats.totalChains / stats.totalLeads) * 100 : 0}%` }}></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Independent Properties</span>
              <span className="text-sm font-medium">{stats.totalIndependent} leads</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${stats.totalLeads > 0 ? (stats.totalIndependent / stats.totalLeads) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Duplicate Detection</h3>
              <div className="bg-red-50 p-2 rounded-full">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            {stats.totalDuplicates > 0 ? (
              <>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Duplicate Groups</span>
                    <span className="text-sm font-medium text-red-600">{stats.duplicateGroups}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Duplicates</span>
                    <span className="text-sm font-medium text-red-600">{stats.totalDuplicates}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-red-500 h-2.5 rounded-full" 
                      style={{ width: `${stats.totalLeads > 0 ? (stats.totalDuplicates / stats.totalLeads) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <Link 
                  href="/leads/duplicates"
                  className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Duplicates
                </Link>
              </>
            ) : (
              <>
                <div className="text-center py-4">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-sm text-green-600 font-medium">No duplicates found!</p>
                  <p className="text-xs text-gray-500 mt-1">Your leads database is clean</p>
                </div>
                <Link 
                  href="/leads/duplicates"
                  className="inline-flex items-center justify-center w-full px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  View Detection Tool
                </Link>
              </>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Enrichment Status</h3>
              <div className="bg-orange-50 p-2 rounded-full">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Waiting for Enrichment</span>
                <span className="text-sm font-medium text-orange-600">{stats.waitingForEnrichment}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Enriched</span>
                <span className="text-sm font-medium text-green-600">{stats.emailAddresses}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-500 h-2.5 rounded-full" 
                  style={{ width: `${stats.totalLeads > 0 ? (stats.emailAddresses / stats.totalLeads) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="text-center mt-3">
                <Link 
                  href="/leads"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All Leads →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            title="Extract Leads" 
            description="Scrape business data from Google Maps based on location" 
            icon="🔍" 
            linkTo="/leads/extract"
          />
          <FeatureCard 
            title="Manage Campaigns" 
            description="Create and monitor email outreach campaigns" 
            icon="📊" 
            linkTo="/campaigns"
          />
          <FeatureCard 
            title="View Leads" 
            description="Browse, filter and manage your lead database" 
            icon="📋" 
            linkTo="/leads"
          />
          <FeatureCard 
            title="Settings" 
            description="Configure API keys and manage business categories" 
            icon="⚙️" 
            linkTo="/settings"
          />
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        {stats.totalLeads > 0 ? (
          <div className="space-y-6">
            <div>
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">{stats.emailAddresses}</span> out of <span className="font-semibold">{stats.totalLeads}</span> leads have verified emails ({stats.totalLeads > 0 ? Math.round((stats.emailAddresses / stats.totalLeads) * 100) : 0}%)
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${stats.totalLeads > 0 ? Math.round((stats.emailAddresses / stats.totalLeads) * 100) : 0}%` }}></div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Latest Actions</h3>
              <div className="space-y-4">
                {leads
                  .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
                  .slice(0, 5)
                  .map((lead) => (
                    <div key={lead.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm">
                      <div className="flex-shrink-0">
                        {lead.emailStatus?.toLowerCase() === 'verified' || lead.emailStatus?.toLowerCase() === 'valid' ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                            <span className="text-green-600">✓</span>
                          </span>
                        ) : lead.emailStatus?.toLowerCase() === 'invalid' || lead.emailStatus?.toLowerCase() === 'bounced' ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
                            <span className="text-red-600">✗</span>
                          </span>
                        ) : lead.email === 'Not Found' || lead.email === 'not_found' ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                            <span className="text-gray-600">⚫</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100">
                            <span className="text-yellow-600">?</span>
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                        <p className="text-sm text-gray-500">
                          {lead.emailStatus?.toLowerCase() === 'verified' || lead.emailStatus?.toLowerCase() === 'valid' 
                            ? 'Email verified' 
                            : lead.emailStatus?.toLowerCase() === 'invalid' || lead.emailStatus?.toLowerCase() === 'bounced'
                            ? 'Email invalid'
                            : lead.email === 'Not Found' || lead.email === 'not_found'
                            ? 'Email not found'
                            : 'Email unverified'} • {lead.city}, {lead.country}
                        </p>
                        <p className="text-xs text-gray-400">
                          Last updated {formattedDates[lead.lastModified] || 'Loading...'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic">No recent activity to display. Start by extracting some leads!</p>
        )}
      </div>
        </>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import CustomFilter from '../components/CustomFilter';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNotifications } from '../components/SimpleNotificationProvider';
import EnrichmentNotification from '../components/EnrichmentNotification';
import EnrichmentProgressNotification from '../components/EnrichmentProgressNotification';

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
  business_type: string; // Updated to match Supabase column name
  facebook_url: string; // Updated to match Supabase column name
  linkedin_url: string; // Updated to match Supabase column name
  location: string;
  address: string;
  created_at: string; // Updated to match Supabase column name
  record_owner: string; // Updated to match Supabase column name
  email: string;
  email_status: string; // Updated to match Supabase column name
  last_modified: string; // Updated to match Supabase column name
  bounce_host: string; // Updated to match Supabase column name
  campaign: string;
  campaign_status: string; // New field to track if campaign is 'new' or 'sent'
  currency: string;
  chain: string; // Updated to match Supabase column name
};

// Utility function to detect if a lead is part of a chain based on website domain AND business name
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

// Define the SavedView type
type SavedView = {
  id: string;
  name: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  filters: {
    locationFilter: string[];
    businessTypeFilter: string[];
    emailStatusFilter: string;
    countryFilter: string;
    campaignFilter: string;
    recordOwnerFilter: string;
    createdDateFilter: { startDate: string; endDate: string };
    chainStatusFilter: 'all' | 'chain' | 'independent';
    customFilters: {field: string, operator: string, value: string}[];
    searchQuery: string;
    viewMode: 'all' | 'compact' | 'custom';
    customColumns: string[];
    groupBy: string;
  };
};

// 1. Always include 'created_at' and 'last_modified' in compact and custom columns
const alwaysVisibleColumns = ['created_at', 'last_modified'];
const defaultCompactColumns = ['name', 'website', 'email', 'email_status', 'phone', 'country', 'city', 'business_type', 'campaign', 'chain'];

// 2. When rendering columns for compact/custom views, ensure these columns are always present
const getVisibleColumns = (columns: string[]) => {
  const withRequired = [...columns];
  alwaysVisibleColumns.forEach(col => {
    if (!withRequired.includes(col)) withRequired.push(col);
  });
  return withRequired;
};

// 1. CSV export utility
function leadsToCSV(leads: Lead[], columns: string[]) {
  if (!leads.length) return '';
  const headers = columns;
  const csvRows = [headers.join(',')];
  for (const lead of leads) {
    const row = headers.map(h => {
      let val = (lead as any)[h];
      if (typeof val === 'string') {
        // Escape quotes and commas
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      if (val === undefined || val === null) val = '';
      return val;
    });
    csvRows.push(row.join(','));
  }
  return csvRows.join('\n');
}

function downloadCSV(leads: Lead[], columns: string[]) {
  const csv = leadsToCSV(leads, columns);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads_export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
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

  // Save leads to localStorage whenever they change
  useEffect(() => {
    if (leads.length > 0) {
      localStorage.setItem('leads', JSON.stringify(leads));
    }
  }, [leads]);

  // Helper function to get default compact columns
  const getDefaultCompactColumns = (): string[] => {
    return [...defaultCompactColumns];
  };

  // Filter states
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string[]>([]);
  const [emailStatusFilter, setEmailStatusFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [recordOwnerFilter, setRecordOwnerFilter] = useState('');
  const [createdDateFilter, setCreatedDateFilter] = useState<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' });
  const [chainStatusFilter, setChainStatusFilter] = useState<'all' | 'chain' | 'independent'>('all');
  // Custom filters state
  const [customFilters, setCustomFilters] = useState<{field: string, operator: string, value: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNameColumnFrozen, setIsNameColumnFrozen] = useState(false);
  
  // Column resizing state
  const [nameColumnWidth, setNameColumnWidth] = useState(250); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [showFullName, setShowFullName] = useState<{[key: string]: boolean}>({});

  // Initialize viewMode and customColumns from localStorage or defaults
  const [viewMode, setViewMode] = useState<'all' | 'compact' | 'custom'>(() => {
    try {
      const saved = localStorage.getItem('leadsViewMode');
      return saved ? JSON.parse(saved) : 'compact';
    } catch {
      return 'compact';
    }
  });
  
  const [customColumns, setCustomColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('leadsCustomColumns');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed : getDefaultCompactColumns();
      }
      return getDefaultCompactColumns();
    } catch {
      return getDefaultCompactColumns();
    }
  });

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  const [editingField, setEditingField] = useState<{leadId: string, field: string, originalValue: any} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [actionHistory, setActionHistory] = useState<{
    id: string,
    leadId: string,
    field: string,
    oldValue: any,
    newValue: any,
    timestamp: number,
    originalIndex?: number
  }[]>([]);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoMessage, setUndoMessage] = useState('');
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [tempColumns, setTempColumns] = useState<string[]>([]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFieldQuery, setSearchFieldQuery] = useState('');

  // Email Enrichment State
  const [enrichmentJobId, setEnrichmentJobId] = useState<string | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [showEnrichConfirmModal, setShowEnrichConfirmModal] = useState(false);
  const [showEnrichmentDropdown, setShowEnrichmentDropdown] = useState(false);
  const [selectedEnrichmentType, setSelectedEnrichmentType] = useState<'email' | 'linkedin' | 'facebook'>('email');
  const [enrichmentPreCheckData, setEnrichmentPreCheckData] = useState<{
    totalSelected: number;
    alreadyVerified: number;
    needsEnrichment: number;
    noWebsite: number;
  } | null>(null);

  // Users state for Record Owner filter  
  const [users, setUsers] = useState<{id: string, first_name: string, last_name: string, email: string}[]>([]);

  // Save viewMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('leadsViewMode', JSON.stringify(viewMode));
  }, [viewMode]);

  // Save customColumns to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('leadsCustomColumns', JSON.stringify(customColumns));
  }, [customColumns]);
  
  // Type for filter fields
  type FilterField = {
    key: string;
    label: string;
  };

  // Define available filter fields
  const availableFilterFields: FilterField[] = [
    { key: 'name', label: 'Name' },
    { key: 'website', label: 'Website' },
    { key: 'email', label: 'Email' },
    { key: 'email_status', label: 'Email Status' },
    { key: 'country', label: 'Country' },
    { key: 'city', label: 'City' },
    { key: 'business_type', label: 'Business Type' },
    { key: 'linkedin_url', label: 'LinkedIn URL' },
    { key: 'facebook_url', label: 'Facebook URL' },
    { key: 'campaign', label: 'Campaign' },
    { key: 'record_owner', label: 'Record Owner' },
    { key: 'chain', label: 'Chain Status' }
  ];
  
  // Saved views state
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [showLoadViewModal, setShowLoadViewModal] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [isPublicView, setIsPublicView] = useState(false);
  const [currentUser, setCurrentUser] = useState('Current User');
  const [viewToDelete, setViewToDelete] = useState<SavedView | null>(null);
  const [selectedView, setSelectedView] = useState<SavedView | null>(null);
  const [hasViewChanges, setHasViewChanges] = useState(false);
  const [groupBy, setGroupBy] = useState<string>('none');
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');

  // Load saved views from localStorage on component mount
  useEffect(() => {
    const storedViews = localStorage.getItem('savedViews');
    if (storedViews) {
      setSavedViews(JSON.parse(storedViews));
    }
  }, []);
  
  // Save views to localStorage when they change
  useEffect(() => {
    localStorage.setItem('savedViews', JSON.stringify(savedViews));
  }, [savedViews]);
  
  // Function to save the current view
  const saveCurrentView = () => {
    if (!newViewName.trim()) return;
    
    const newView: SavedView = {
      id: Date.now().toString(),
      name: newViewName,
      isPublic: isPublicView,
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
      filters: {
        locationFilter: [...locationFilter],
        businessTypeFilter: [...businessTypeFilter],
        emailStatusFilter,
        countryFilter,
        campaignFilter,
        recordOwnerFilter,
        createdDateFilter: { ...createdDateFilter },
        chainStatusFilter,
        customFilters: [...customFilters],
        searchQuery,
        viewMode,
        customColumns: [...customColumns],
        groupBy // <-- save groupBy
      }
    };
    
    setSavedViews([...savedViews, newView]);
    setShowSaveViewModal(false);
    setNewViewName('');
    setIsPublicView(false);
  };
  
  // Function to apply a saved view
  const applySavedView = (view: SavedView) => {
    setSelectedView(view);
    setLocationFilter(view.filters.locationFilter);
    setBusinessTypeFilter(view.filters.businessTypeFilter);
    setEmailStatusFilter(view.filters.emailStatusFilter);
    setCountryFilter(view.filters.countryFilter);
    setCampaignFilter(view.filters.campaignFilter);
    setRecordOwnerFilter(view.filters.recordOwnerFilter);
    setCreatedDateFilter(view.filters.createdDateFilter);
    setChainStatusFilter(view.filters.chainStatusFilter);
    setCustomFilters(view.filters.customFilters);
    setSearchQuery(view.filters.searchQuery);
    setViewMode('custom');
    setCustomColumns([...view.filters.customColumns]);
    setGroupBy(view.filters.groupBy || 'none'); // <-- restore groupBy
    setShowLoadViewModal(false);
    setHasViewChanges(false);
  };
  
  // Function to delete a saved view
  const deleteSavedView = (view: SavedView) => {
    setViewToDelete(view);
  };
  
  // Function to confirm deletion of a saved view
  const confirmDeleteView = () => {
    if (viewToDelete) {
      setSavedViews(savedViews.filter(view => view.id !== viewToDelete.id));
      setViewToDelete(null);
    }
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual lead selection
  const handleSelectLead = (id: string) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(leadId => leadId !== id));
      if (selectAll) setSelectAll(false);
    } else {
      setSelectedLeads([...selectedLeads, id]);
      if (selectedLeads.length + 1 === filteredLeads.length) setSelectAll(true);
    }
  };

  // Apply filters to the leads
  const filteredLeads = leads.filter(lead => {
    // Search query filter (searches across all fields)
    if (searchQuery && !Object.values(lead).some(value => 
      value !== null && 
      value !== undefined && 
      value.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )) {
      return false;
    }
    
    // Apply custom filters
    if (customFilters.length > 0) {
      const passesCustomFilters = customFilters.every(filter => {
        const fieldValue = (lead as any)[filter.field];
        
        // Handle different operators
        switch (filter.operator) {
          case 'contains':
            return fieldValue && fieldValue.toString().toLowerCase().includes(filter.value.toLowerCase());
          case 'does_not_contain':
            return !fieldValue || !fieldValue.toString().toLowerCase().includes(filter.value.toLowerCase());
          case 'is':
            return fieldValue && fieldValue.toString().toLowerCase() === filter.value.toLowerCase();
          case 'is_not':
            return !fieldValue || fieldValue.toString().toLowerCase() !== filter.value.toLowerCase();
          case 'is_empty':
            return !fieldValue || fieldValue.toString().trim() === '';
          case 'is_not_empty':
            return fieldValue && fieldValue.toString().trim() !== '';
          case 'is_chain':
            return detectChainStatus(lead.website, chainEntries);
          case 'is_not_chain':
            return !detectChainStatus(lead.website, chainEntries);
          default:
            return true;
        }
      });
      
      if (!passesCustomFilters) {
        return false;
      }
    }
    
    // Record owner filter  
    if (recordOwnerFilter && lead.record_owner !== getUserId(recordOwnerFilter)) {
      return false;
    }
    
    // Created date filter
    if (createdDateFilter.startDate || createdDateFilter.endDate) {
      const leadDate = new Date(lead.created_at);
      const startDate = createdDateFilter.startDate ? new Date(createdDateFilter.startDate) : null;
      const endDate = createdDateFilter.endDate ? new Date(createdDateFilter.endDate) : null;
      if (startDate && leadDate < startDate) {
        return false;
      }
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
        if (leadDate > endDate) {
          return false;
        }
      }
    }
    
    // Chain status filter - now using automatic detection
    if (chainStatusFilter !== 'all') {
      const isChain = detectChainStatus(lead.website, chainEntries);
      if (chainStatusFilter === 'chain' && !isChain) {
        return false;
      }
      if (chainStatusFilter === 'independent' && isChain) {
        return false;
      }
    }
    
    return (
      (locationFilter.length === 0 || 
        locationFilter.some(loc => 
          (lead.city && lead.city.toLowerCase().includes(loc.toLowerCase()))
        )
      ) &&
      (businessTypeFilter.length === 0 || businessTypeFilter.includes(lead.business_type)) &&
      (emailStatusFilter === '' || lead.email_status === emailStatusFilter) &&
      (countryFilter === '' || lead.country === countryFilter) &&
      (campaignFilter === '' || (lead.campaign && lead.campaign.includes(campaignFilter)))
    );
  });

  // Debug logging for filtered results
  useEffect(() => {
    if (emailStatusFilter) {
      console.log('🔢 Filtered leads count:', filteredLeads.length);
      console.log('📋 Current email status filter:', emailStatusFilter);
      console.log('🎯 Filtered leads:', filteredLeads.slice(0, 3).map(l => ({ name: l.name, email_status: l.email_status })));
    }
  }, [filteredLeads, emailStatusFilter]);

  // Highlight matching text
  const highlightMatch = (text: string) => {
    if (!searchQuery || !text) return text;
    
    const parts = text.toString().split(new RegExp(`(${searchQuery})`, 'gi'));
    
    return parts.map((part, index) => 
      part.toLowerCase() === searchQuery.toLowerCase() 
        ? <span key={index} className="bg-yellow-200">{part}</span> 
        : part
    );
  };

  // Available filter options
  const locations = Array.from(new Set(leads.map(lead => lead.city).filter(city => city !== null && city !== undefined))).sort();
  const businessTypes = Array.from(new Set(leads.map(lead => lead.business_type).filter(type => type !== null && type !== undefined))).sort();
  const statuses = Array.from(new Set(leads.map(lead => lead.email_status).filter(status => status !== null && status !== undefined))).sort();
  const countries = Array.from(new Set(leads.map(lead => lead.country).filter(country => country !== null && country !== undefined))).sort();
  const campaignOptions = Array.from(new Set(leads.map(lead => lead.campaign).filter(campaign => campaign !== null && campaign !== undefined && campaign !== ''))).sort();
  
  // Helper function to get user name from user ID
  const getUserName = (userId: string): string => {
    if (!users || users.length === 0) return 'Loading...';
    const user = users.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
  };
  
  // Helper function to get user ID from user name
  const getUserId = (userName: string): string => {
    if (!users || users.length === 0) return '';
    const user = users.find(u => `${u.first_name} ${u.last_name}` === userName);
    return user ? user.id : '';
  };
  
  // Calculate unique record owners (showing names instead of UUIDs)
  const uniqueOwnerIds = Array.from(new Set(leads.map(lead => lead.record_owner).filter(owner => owner !== null && owner !== undefined)));
  const recordOwners = users.length > 0 ? uniqueOwnerIds.map(ownerId => getUserName(ownerId)).sort() : [];
  
  // Helper function to get user-friendly display names for email statuses
  const getEmailStatusDisplayName = (status: string): string => {
    switch (status) {
      case 'verified':
        return 'Valid';
      case 'invalid':
        return 'Invalid';
      case 'not_found':
        return 'Not Found';
      case 'unverified':
        return 'Unverified';
      default:
        return status;
    }
  };

  // Handle adding a custom filter
  const handleAddCustomFilter = (field: string, operator: string, value: string) => {
    setCustomFilters([...customFilters, { field, operator, value }]);
  };

  // Handle removing a custom filter
  const handleRemoveCustomFilter = (index: number) => {
    const updatedFilters = [...customFilters];
    updatedFilters.splice(index, 1);
    setCustomFilters(updatedFilters);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format datetime for display
  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '';
    
    // Create date object and explicitly convert to UK timezone
    const date = new Date(dateTimeString);
    
    // Format as: "16 Jun 2025, 4:26 pm" in UK timezone
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Europe/London'
    });
  };

  // Handle edit field click
  const handleEditField = (leadId: string, field: string, value: any) => {
    setEditingField({ leadId, field, originalValue: value });
    setEditValue(value?.toString() || '');
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingField) return;
    
    const { leadId, field, originalValue } = editingField;
    
    // Only proceed if value actually changed
    if (originalValue?.toString() === editValue) {
      setEditingField(null);
      return;
    }

    try {
      // Prepare update data
      const updateData: any = { [field]: editValue };
      
      // Only update last_modified if we're not editing the timestamp fields themselves
      if (field !== 'created_at' && field !== 'last_modified') {
        // Set last_modified to current UK local time in simple format (YYYY-MM-DD HH:MM)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        updateData.last_modified = `${year}-${month}-${day} ${hours}:${minutes}`;
      }

      // Update in Supabase database
      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      // Add to action history for undo functionality
      const newAction = {
        id: Date.now().toString(),
        leadId,
        field,
        oldValue: originalValue,
        newValue: editValue,
        timestamp: Date.now()
      };
      
      setActionHistory(prev => [newAction, ...prev]);
    
      // Update local state to reflect the change (and last_modified if updated)
    const updatedLeads = leads.map(lead => {
      if (lead.id === leadId) {
          const updatedLead = { ...lead, [field]: editValue };
          if (updateData.last_modified) {
            updatedLead.last_modified = updateData.last_modified;
          }
          return updatedLead;
      }
      return lead;
    });
    
    setLeads(updatedLeads);
    setEditingField(null);

      // Show success message
      setToastMessage('Lead updated successfully');
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);

    } catch (error: any) {
      console.error('Error updating lead:', error);
      setToastMessage('Error updating lead: ' + error.message);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
      
      // Don't clear editing field on error so user can try again
    }
  };

  // Modify the handleUndo function to correctly restore leads to their original positions
  const handleUndo = async () => {
    const now = Date.now();
    const recentActions = actionHistory.filter(action => now - action.timestamp <= 5 * 60 * 1000);
    
    if (recentActions.length === 0) {
      setToastMessage('No recent actions to undo');
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
      return;
    }
    
    const lastAction = recentActions[0];
    
    if (lastAction.field === 'delete') {
      try {
        // Restore to Supabase database
        const { error } = await supabase
          .from('leads')
          .insert([lastAction.oldValue]);

        if (error) {
          throw error;
        }

      // Create a new array to avoid mutating state directly
      const newLeads = [...leads];
      
      // Ensure we have a valid index
      if (typeof lastAction.originalIndex === 'number' && lastAction.originalIndex >= 0) {
        // Insert at the original position
        newLeads.splice(lastAction.originalIndex, 0, lastAction.oldValue);
      } else {
        // Fallback to appending at the end if index is invalid
        newLeads.push(lastAction.oldValue);
      }
      
      setLeads(newLeads);
        setToastMessage('Lead restored to database successfully');
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
        
      } catch (error: any) {
        console.error('Error restoring lead:', error);
        setToastMessage('Error restoring lead: ' + error.message);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 5000);
        return; // Don't remove from action history if restore failed
      }
    } else {
      try {
        // Handle other field changes - update in database
        const { error } = await supabase
          .from('leads')
          .update({ [lastAction.field]: lastAction.oldValue })
          .eq('id', lastAction.leadId);

        if (error) {
          throw error;
        }

        // Update local state
      const updatedLeads = leads.map(lead => {
        if (lead.id === lastAction.leadId) {
          return {
            ...lead,
            [lastAction.field]: lastAction.oldValue
          };
        }
        return lead;
      });
      
      setLeads(updatedLeads);
        setToastMessage('Changes undone successfully');
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
        
      } catch (error: any) {
        console.error('Error undoing changes:', error);
        setToastMessage('Error undoing changes: ' + error.message);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 5000);
        return; // Don't remove from action history if undo failed
      }
    }
    
    // Remove the undone action from history
    setActionHistory(actionHistory.filter(action => action.id !== lastAction.id));
  };

  // Check if undo is available
  const canUndo = () => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    return actionHistory.some(action => action.timestamp > fiveMinutesAgo);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingField(null);
  };

  // Handle edit keydown events
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Truncate website URLs for more compact display
  const truncateWebsite = (url: string) => {
    if (!url) return '';
    
    try {
    // Remove common prefixes
    let cleaned = url.replace(/^(https?:\/\/)?(www\.)?/i, '');
    
      // Split by / to get domain and path
      const parts = cleaned.split('/');
      const domain = parts[0];
      
      // If it's just a domain, truncate if too long
      if (parts.length === 1) {
        if (domain.length > 20) {
          return domain.substring(0, 17) + '...';
        }
        return domain;
      }
      
      // If there's a path, just show domain + /...
      if (domain.length > 15) {
        return domain.substring(0, 12) + '.../...';
      }
      
      return domain + '/...';
    } catch (error) {
      // Fallback for any parsing errors
      let cleaned = url.replace(/^(https?:\/\/)?(www\.)?/i, '');
      if (cleaned.length > 20) {
        return cleaned.substring(0, 17) + '...';
      }
    return cleaned;
    }
  };

  // Truncate long text fields for compact display
  const truncateText = (text: string, maxLength: number = 25) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Handle column resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = nameColumnWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(150, Math.min(500, startWidth + deltaX)); // Min 150px, Max 500px
      setNameColumnWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Modify the renderEditableField function to handle website display and double-click editing
  const renderEditableField = (lead: any, field: string, value: any, isTextarea: boolean = false) => {
    // FIRST: Special handling for email status - MUST be at the top to override general editing logic
    if (field === 'email_status') {
      // If we're in editing mode, show dropdown ONLY
      if (editingField && editingField.leadId === lead.id && editingField.field === field) {
        return (
          <select
            className="w-full border-2 border-blue-500 rounded-md shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-500 p-2 text-sm bg-white z-50 relative"
            style={{ minWidth: '120px' }}
            value={editValue || 'unverified'}
            onChange={(e) => {
              setEditValue(e.target.value);
              // Auto-save immediately when selection changes
              setTimeout(() => {
                setEditingField(null);
                handleLeadUpdate(lead.id, field, e.target.value);
              }, 50);
            }}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveEdit();
              } else if (e.key === 'Escape') {
                handleCancelEdit();
              }
            }}
            autoFocus
          >
            <option value="verified">Valid</option>
            <option value="invalid">Invalid</option>
            <option value="not_found">Not Found</option>
            <option value="unverified">Unverified</option>
          </select>
        );
      }
      
      // Display mode with status badge (double-click to edit)
      const displayValue = getEmailStatusDisplayName(value || 'unverified');
      const statusColors: { [key: string]: string } = {
        'Valid': 'bg-green-100 text-green-800',
        'Invalid': 'bg-red-100 text-red-800', 
        'Not Found': 'bg-blue-100 text-blue-800',
        'Unverified': 'bg-yellow-100 text-yellow-800'
      };
      
      return (
        <span 
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${statusColors[displayValue] || 'bg-gray-100 text-gray-800'}`}
          onDoubleClick={() => handleEditField(lead.id, field, value || 'unverified')}
          title="Double-click to edit status"
        >
          {displayValue}
        </span>
      );
    }

    // General editing logic for all other fields
    if (editingField && editingField.leadId === lead.id && editingField.field === field) {
      if (isTextarea) {
        return (
          <textarea
            className="w-full min-w-32 border-2 border-blue-500 rounded-md shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-500 p-2 text-sm bg-white z-50 relative"
            style={{ minHeight: '60px', minWidth: '200px' }}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleSaveEdit}
            autoFocus
          />
        );
      }
      return (
        <input
          type="text"
          className="w-full min-w-32 border-2 border-blue-500 rounded-md shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-500 p-2 text-sm bg-white z-50 relative"
          style={{ minWidth: '200px' }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={handleSaveEdit}
          autoFocus
        />
      );
    }

    // Special handling for URL fields
    if (field === 'website') {
      const truncatedUrl = truncateWebsite(value);
      return (
        <div 
          className="cursor-pointer hover:bg-blue-50 p-1 rounded min-h-6 border border-transparent hover:border-blue-200 transition-colors"
          style={{ minWidth: '120px', maxWidth: '200px' }}
          onDoubleClick={() => handleEditField(lead.id, field, value)}
          title={`Double-click to edit • Full URL: ${value || 'No website'}`}
        >
          {value ? (
            <a 
              href={value.startsWith('http') ? value : `https://${value}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {highlightMatch(truncatedUrl)}
            </a>
          ) : (
            <span className="text-gray-400 italic text-sm">No website</span>
          )}
        </div>
      );
    }

    // Special handling for LinkedIn URL
    if (field === 'linkedin_url') {
      return (
        <div 
          className="cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors duration-200"
          onDoubleClick={() => handleEditField(lead.id, field, value)}
          title={value ? "Click to open • Double-click to edit" : "Double-click to add LinkedIn URL"}
        >
          {editingField?.leadId === lead.id && editingField?.field === field ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleEditKeyDown}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            value ? (
              <a 
                href={value.startsWith('http') ? value : `https://${value}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                {highlightMatch(truncateText(value, 30))}
              </a>
            ) : (
              <span className="text-gray-400">Not Found</span>
            )
          )}
        </div>
      );
    }

    // Special handling for Facebook URL
    if (field === 'facebook_url') {
      return (
        <div 
          className="cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors duration-200"
          onDoubleClick={() => handleEditField(lead.id, field, value)}
          title={value ? "Click to open • Double-click to edit" : "Double-click to add Facebook URL"}
        >
          {editingField?.leadId === lead.id && editingField?.field === field ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleEditKeyDown}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            value ? (
              <a 
                href={value.startsWith('http') ? value : `https://${value}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                {highlightMatch(truncateText(value, 30))}
              </a>
            ) : (
              <span className="text-gray-400">Not Found</span>
            )
          )}
        </div>
      );
    }

    // Special handling for long text fields (address, POI, etc.)
    if (field === 'address' || field === 'poi') {
      const truncatedText = truncateText(value, 30);
      return (
        <div 
          className="cursor-pointer hover:bg-blue-50 p-1 rounded min-h-6 border border-transparent hover:border-blue-200 transition-colors"
          style={{ minWidth: '120px', maxWidth: '200px' }}
          onDoubleClick={() => handleEditField(lead.id, field, value)}
          title={`Double-click to edit • Full text: ${value || 'Click to add'}`}
        >
          {value ? (
            <span className="text-sm">{highlightMatch(truncatedText)}</span>
          ) : (
            <span className="text-gray-400 italic text-sm">Click to add</span>
          )}
        </div>
      );
    }

    // Special handling for social media URLs  
    if (field === 'facebook_url' || field === 'linkedin_url') {
      const truncatedUrl = truncateText(value, 25);
      return (
        <div 
          className="cursor-pointer hover:bg-blue-50 p-1 rounded min-h-6 border border-transparent hover:border-blue-200 transition-colors"
          style={{ minWidth: '120px', maxWidth: '180px' }}
          onDoubleClick={() => handleEditField(lead.id, field, value)}
          title={`Double-click to edit • Full URL: ${value || 'Click to add'}`}
        >
          {value ? (
            <a 
              href={value.startsWith('http') ? value : `https://${value}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {highlightMatch(truncatedUrl)}
            </a>
          ) : (
            <span className="text-gray-400 italic text-sm">Click to add</span>
          )}
        </div>
      );
    }

    // Special handling for chain status
    if (field === 'chain') {
      const isChain = detectChainStatus(lead.website, chainEntries);
      return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          isChain 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {isChain ? 'Chain' : 'Independent'}
        </span>
      );
    }

    // Special handling for email status
    if (field === 'email_status') {
      // If we're in editing mode, show dropdown
      if (editingField && editingField.leadId === lead.id && editingField.field === field) {
        return (
          <select
            className="w-full border-2 border-blue-500 rounded-md shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-500 p-2 text-sm bg-white z-50 relative"
            style={{ minWidth: '120px' }}
            value={editValue || 'unverified'}
            onChange={(e) => {
              setEditValue(e.target.value);
              // Auto-save immediately when selection changes
              setTimeout(() => {
                setEditingField(null);
                handleLeadUpdate(lead.id, field, e.target.value);
              }, 50);
            }}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveEdit();
              } else if (e.key === 'Escape') {
                handleCancelEdit();
              }
            }}
            autoFocus
          >
            <option value="verified">Valid</option>
            <option value="invalid">Invalid</option>
            <option value="not_found">Not Found</option>
            <option value="unverified">Unverified</option>
          </select>
        );
      }
      
      // Display mode with status badge (double-click to edit)
      const displayValue = getEmailStatusDisplayName(value || 'unverified');
      const statusColors: { [key: string]: string } = {
        'Valid': 'bg-green-100 text-green-800',
        'Invalid': 'bg-red-100 text-red-800', 
        'Not Found': 'bg-blue-100 text-blue-800',
        'Unverified': 'bg-yellow-100 text-yellow-800'
      };
      
      return (
        <span 
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${statusColors[displayValue] || 'bg-gray-100 text-gray-800'}`}
          onDoubleClick={() => handleEditField(lead.id, field, value || 'unverified')}
          title="Double-click to edit status"
        >
          {displayValue}
        </span>
      );
    }

    // Special handling for campaign field - display with remove button
    if (field === 'campaign') {
    return (
      <div 
          className="p-1 rounded min-h-6 text-sm flex items-center justify-between"
          style={{ minWidth: '180px', maxWidth: '250px' }}
          title={value ? `Campaign: ${value}` : 'No campaign assigned'}
        >
          {value ? (
            <>
              <span className="text-gray-900 flex-1 mr-2">{highlightMatch(value)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCampaign(lead.id);
                }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 flex-shrink-0 transition-colors"
                title="Remove campaign"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <span className="text-gray-400 italic">No campaign</span>
          )}
        </div>
      );
    }

    // Special handling for datetime fields (non-editable)
    if (field === 'created_at' || field === 'last_modified') {
      const formattedDate = formatDateTime(value);
    return (
      <div 
          className="p-1 rounded min-h-6 text-xs text-gray-600 bg-gray-50"
          style={{ minWidth: '140px' }}
          title={`System managed field • Full timestamp: ${value}`}
        >
          {formattedDate || <span className="text-gray-400 italic">No date</span>}
        </div>
      );
    }

    // Default handling for other fields - make them compact and double-click to edit
    return (
      <div 
        className="cursor-pointer hover:bg-blue-50 p-1 rounded min-h-6 border border-transparent hover:border-blue-200 transition-colors"
        style={{ minWidth: '120px', maxWidth: field === 'name' ? '250px' : '180px' }}
        onDoubleClick={() => handleEditField(lead.id, field, value)}
        title={field === 'name' ? `${value || 'Click to add'} • Double-click to edit` : 'Double-click to edit'}
      >
        {value ? (
          <span className="text-sm">
            {highlightMatch(truncateText(value, 25))}
          </span>
        ) : (
          <span className="text-gray-400 italic text-sm">Click to add</span>
        )}
      </div>
    );
  };

  // Delete selected leads
  const handleDeleteSelected = () => {
    if (selectedLeads.length === 0) return;
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (deleteConfirmation !== selectedLeads.length.toString()) return;
    
    try {
      // Delete from Supabase database
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', selectedLeads);

      if (error) {
        throw error;
      }
    
    // Add to action history for each deleted lead
    selectedLeads.forEach(leadId => {
      const leadToDelete = leads.find(lead => lead.id === leadId);
      if (leadToDelete) {
        const originalIndex = leads.findIndex(lead => lead.id === leadId);
        const newAction = {
          id: Date.now().toString(),
          leadId: leadId,
          field: 'delete',
          oldValue: leadToDelete,
          newValue: null,
          timestamp: Date.now(),
          originalIndex: originalIndex // Add the original index
        };
        setActionHistory(prev => [newAction, ...prev]);
      }
    });

    const remainingLeads = leads.filter(lead => !selectedLeads.includes(lead.id));
    setLeads(remainingLeads);
    setSelectedLeads([]);
    setDeleteConfirmation('');
    setShowDeleteModal(false);
    
      // Show success toast message
      setToastMessage(`${selectedLeads.length} leads deleted successfully from database.`);
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
      
    } catch (error: any) {
      console.error('Error deleting leads:', error);
      setToastMessage('Error deleting leads: ' + error.message);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
    }
  };

  // Handle single lead delete
  const handleDeleteLead = async (id: string) => {
    const leadToDelete = leads.find(lead => lead.id === id);
    if (!leadToDelete) return;

    try {
      // Delete from Supabase database
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

    // Find the original index
    const originalIndex = leads.findIndex(lead => lead.id === id);

    // Add to action history with the original index
    const newAction = {
      id: Date.now().toString(),
      leadId: id,
      field: 'delete',
      oldValue: leadToDelete,
      newValue: null,
      timestamp: Date.now(),
      originalIndex: originalIndex // Add the original index
    };
    setActionHistory(prev => [newAction, ...prev]);
    
    const remainingLeads = leads.filter(lead => lead.id !== id);
    setLeads(remainingLeads);
    setSelectedLeads(selectedLeads.filter(leadId => leadId !== id));
    
      // Show success toast message
      setToastMessage('Lead deleted successfully from database.');
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
      
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      setToastMessage('Error deleting lead: ' + error.message);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
    }
  };

  // Available column options with labels and icons
  const availableColumns = [
    { key: 'id', label: 'ID', icon: '🆔', type: 'text' },
    { key: 'name', label: 'Name', icon: '👤', type: 'text' },
    { key: 'website', label: 'Website', icon: '🔗', type: 'url' },
    { key: 'phone', label: 'Phone', icon: '📞', type: 'phone' },
    { key: 'country', label: 'Country', icon: '🌍', type: 'select' },
    { key: 'city', label: 'City', icon: '🏙️', type: 'text' },
    { key: 'poi', label: 'POI', icon: '📍', type: 'text' },
    { key: 'business_type', label: 'Business Type', icon: '🏢', type: 'select' },
    { key: 'facebook_url', label: 'Facebook URL', icon: '📘', type: 'url' },
    { key: 'linkedin_url', label: 'LinkedIn URL', icon: '💼', type: 'url' },
    { key: 'location', label: 'Location', icon: '📌', type: 'text' },
    { key: 'address', label: 'Address', icon: '🏠', type: 'text' },
    { key: 'created_at', label: 'Created Date', icon: '📅', type: 'datetime' },
    { key: 'record_owner', label: 'Record Owner', icon: '👨‍💼', type: 'select' },
    { key: 'email', label: 'Email', icon: '✉️', type: 'email' },
    { key: 'email_status', label: 'Email Status', icon: '✅', type: 'status' },
    { key: 'last_modified', label: 'Last Modified', icon: '🔄', type: 'datetime' },
    { key: 'bounce_host', label: 'Bounce Host', icon: '⚠️', type: 'checkbox' },
    { key: 'campaign', label: 'Campaign', icon: '📢', type: 'select' },
    { key: 'currency', label: 'Currency', icon: '💰', type: 'text' },
    { key: 'chain', label: 'Chain Status', icon: '🏪', type: 'status' }
  ];

  // Handle column toggle
  const toggleColumn = (key: string) => {
    if (tempColumns.includes(key)) {
      setTempColumns(tempColumns.filter(col => col !== key));
    } else {
      setTempColumns([...tempColumns, key]);
    }
  };

  // Handle column drag start
  const handleDragStart = (e: React.DragEvent, key: string, index: number) => {
    setDraggedColumn(key);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', key);
  };

  // Handle column drag over
  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(targetIndex);
  };

  // Handle column drop
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedColumn) return;

    const draggedIndex = tempColumns.indexOf(draggedColumn);
    if (draggedIndex === -1) return;

    const newColumns = [...tempColumns];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, draggedColumn);
    
    setTempColumns(newColumns);
    setDraggedColumn(null);
    setDragOverIndex(null);
  };

  // Handle column drag end
  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverIndex(null);
  };

  // Get column info by key
  const getColumnInfo = (key: string) => {
    return availableColumns.find(col => col.key === key) || { key, label: key, icon: '📝', type: 'text' };
  };

  // Get column label by key (backward compatibility)
  const getColumnLabel = (key: string) => {
    return getColumnInfo(key).label;
  };

  // Filter available columns based on search
  const getFilteredAvailableColumns = () => {
    return availableColumns.filter(col => 
      !tempColumns.includes(col.key) && 
      col.key !== 'id' &&
      (col.label.toLowerCase().includes(searchFieldQuery.toLowerCase()) ||
       col.key.toLowerCase().includes(searchFieldQuery.toLowerCase()))
    );
  };

  // Move column up/down in the list
  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newColumns = [...tempColumns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newColumns.length) {
      [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
      setTempColumns(newColumns);
    }
  };

  // Function to save changes to the current view
  const saveViewChanges = () => {
    if (!selectedView) return;
    
    const updatedView: SavedView = {
      ...selectedView,
      filters: {
        locationFilter: [...locationFilter],
        businessTypeFilter: [...businessTypeFilter],
        emailStatusFilter,
        countryFilter,
        campaignFilter,
        recordOwnerFilter,
        createdDateFilter: { ...createdDateFilter },
        chainStatusFilter,
        customFilters: [...customFilters],
        searchQuery,
        viewMode,
        customColumns: [...customColumns],
        groupBy // <-- save groupBy
      }
    };
    
    setSavedViews(savedViews.map(view => 
      view.id === selectedView.id ? updatedView : view
    ));
    setHasViewChanges(false);
  };

  // Add effect to detect changes in view settings
  useEffect(() => {
    if (selectedView) {
      const currentSettings = {
        locationFilter,
        businessTypeFilter,
        emailStatusFilter,
        countryFilter,
        campaignFilter,
        recordOwnerFilter,
        createdDateFilter,
        chainStatusFilter,
        customFilters,
        searchQuery,
        viewMode,
        customColumns,
        groupBy
      };
      
      const hasChanges = JSON.stringify(currentSettings) !== JSON.stringify(selectedView.filters);
      setHasViewChanges(hasChanges);
    }
  }, [
    locationFilter,
    businessTypeFilter,
    emailStatusFilter,
    countryFilter,
    campaignFilter,
    recordOwnerFilter,
    createdDateFilter,
    chainStatusFilter,
    customFilters,
    searchQuery,
    viewMode,
    customColumns,
    groupBy,
    selectedView
  ]);

  // Function to open the columns modal
  const openColumnsModal = () => {
    // Reset search query
    setSearchFieldQuery('');
    
    // Initialize temp columns based on current view mode
    if (viewMode === 'all') {
      // For all fields view, use all available columns except ID
      setTempColumns(availableColumns.map(col => col.key).filter(key => key !== 'id'));
    } else if (viewMode === 'custom' && selectedView) {
      // For custom views, use the selected view's columns
      setTempColumns([...selectedView.filters.customColumns]);
    } else {
      // For compact view, use the current customColumns
      setTempColumns([...customColumns]);
    }
    setShowColumnsModal(true);
  };

  // Function to apply column changes
  const applyColumnChanges = () => {
    // Add to action history if columns actually changed
    if (JSON.stringify(customColumns) !== JSON.stringify(tempColumns)) {
      const newAction = {
        id: Date.now().toString(),
        leadId: 'columns',
        field: 'customColumns',
        oldValue: [...customColumns],
        newValue: [...tempColumns],
        timestamp: Date.now()
      };
      
      setActionHistory(prev => [newAction, ...prev]);
    }
    
    // Update columns based on view mode
    if (viewMode === 'custom' && selectedView) {
      // Update the selected view's columns
      const updatedView = {
        ...selectedView,
        filters: {
          ...selectedView.filters,
          customColumns: [...tempColumns]
        }
      };
      setSelectedView(updatedView);
    }
    
    setCustomColumns([...tempColumns]);
    setShowColumnsModal(false);
  };

  // Function to cancel column changes
  const cancelColumnChanges = () => {
    setSearchFieldQuery('');
    setShowColumnsModal(false);
  };

  const closeColumnsModal = () => {
    setSearchFieldQuery('');
    setShowColumnsModal(false);
  };

  // Toast component
  const Toast = () => {
    if (!isToastVisible) return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg">
        {toastMessage}
      </div>
    );
  };

  // Helper to group leads by a field
  const groupLeads = (leads: Lead[], field: string) => {
    if (field === 'none') return { '': leads };
    return leads.reduce((groups: Record<string, Lead[]>, lead) => {
      const key = (lead as any)[field] || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(lead);
      return groups;
    }, {});
  };

  const groupOptions = [
    { value: 'none', label: 'No Grouping' },
    { value: 'city', label: 'City' },
    { value: 'country', label: 'Country' },
    { value: 'record_owner', label: 'Record Owner' },
    { value: 'business_type', label: 'Business Type' },
    { value: 'campaign', label: 'Campaign' },
  ];

  // Add state for expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // When groupBy changes, collapse all groups by default
  useEffect(() => {
    if (groupBy === 'none') {
      setExpandedGroups({});
    } else {
      const grouped = groupLeads(filteredLeads, groupBy);
      if (Object.keys(grouped).length === 0) {
        setExpandedGroups({});
        return;
      }
      const collapsed: Record<string, boolean> = {};
      Object.keys(grouped).forEach(key => {
        collapsed[key] = false;
      });
      setExpandedGroups(collapsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy]);

  // Handler to toggle group expansion
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Sync selectedLeads and selectAll with filteredLeads
  const filteredLeadIds = filteredLeads.map(l => l.id).join(',');

  useEffect(() => {
    const filteredIds = filteredLeads.map(lead => lead.id);
    const newSelectedLeads = selectedLeads.filter(id => filteredIds.includes(id));
    if (selectAll) {
      setSelectedLeads(filteredIds);
      if (filteredIds.length === 0) setSelectAll(false);
    } else if (newSelectedLeads.length !== selectedLeads.length) {
      setSelectedLeads(newSelectedLeads);
    }
    if (selectAll && selectedLeads.length !== filteredLeads.length) {
      setSelectAll(false);
    }
  }, [filteredLeadIds, selectAll]);

  // Add state for single contact delete modal
  const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  // Add state for original order
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);

  // 2. On initial leads load, store the original order
  useEffect(() => {
    if (leads.length && originalOrder.length === 0) {
      setOriginalOrder(leads.map(l => l.id));
    }
  }, [leads]);

  // 3. Sorting logic for displayed leads
  const getSortedLeads = () => {
    if (sortOrder === 'asc') {
      return [...filteredLeads].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'desc') {
      return [...filteredLeads].sort((a, b) => b.name.localeCompare(a.name));
    } else {
      // Default/original order
      return [...filteredLeads].sort((a, b) => {
        return originalOrder.indexOf(a.id) - originalOrder.indexOf(b.id);
      });
    }
  };

  // Helper to get visible columns in the current view
  function getCurrentVisibleColumns() {
    if (viewMode === 'compact') {
      return getVisibleColumns(customColumns);
    } else if (viewMode === 'custom' && selectedView) {
      return selectedView.filters.customColumns;
    } else {
      return availableColumns.map(col => col.key);
    }
  }

  // Handle campaign selection for a lead
  const handleCampaignSelect = async (leadId: string, campaignId: string, campaignName: string, suppressToast: boolean = false) => {
    try {
      // Set last_modified to current time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${year}-${month}-${day} ${hours}:${minutes}`;

      // Find the lead and get old campaign value before updating
      const targetLead = leads.find(l => l.id === leadId);
      const oldCampaignValue = targetLead?.campaign || '';

      // Update in Supabase - store campaign name instead of ID and set status to 'new'
      const { error } = await supabase
        .from('leads')
        .update({ 
          campaign: campaignName,
          campaign_status: 'new',
          last_modified: currentTime 
        })
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      // Update local state using functional update to prevent race conditions
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, campaign: campaignName, campaign_status: 'new', last_modified: currentTime }
            : lead
        )
      );

      // Add to action history for undo functionality
      const newAction = {
        id: Date.now().toString(),
        leadId: leadId,
        field: 'campaign',
        oldValue: oldCampaignValue,
        newValue: campaignName,
        timestamp: Date.now()
      };
      setActionHistory(prev => [newAction, ...prev]);

      // Show success message only if not suppressed
      if (!suppressToast) {
        setToastMessage(`Campaign "${campaignName}" assigned successfully`);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 3000);
      }

    } catch (error: any) {
      console.error('Error updating campaign:', {
        leadId,
        campaignId,
        campaignName,
        error: error?.message || 'Unknown error',
        stack: error?.stack
      });
      
      // Always show error messages, even during bulk operations
      setToastMessage('Error updating campaign: ' + (error?.message || 'Unknown error occurred'));
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
      
      // Re-throw the error so bulk operations can handle it
      throw error;
    }
  };

  // Campaign assignment modal state
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>('');
  const [bulkCampaignSuccess, setBulkCampaignSuccess] = useState(false);
  const [campaigns, setCampaigns] = useState<{id: string, name: string, instantly_id: string}[]>([]);
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);

  // Campaign upload states
  const [isUploadingToCampaign, setIsUploadingToCampaign] = useState(false);
  const [showUploadResults, setShowUploadResults] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Load campaigns for assignment modal
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/campaigns');
        if (response.ok) {
          const campaignData = await response.json();
          // Filter to only show Live campaigns (exclude Deleted/Archived)
          const liveCampaigns = campaignData.filter((campaign: any) => 
            campaign.status === 'Live'
          );
          setCampaigns(liveCampaigns);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };

    if (showCampaignModal) {
      fetchCampaigns();
    }
  }, [showCampaignModal]);

  // Handle opening campaign assignment modal
  const openCampaignModal = () => {
    if (selectedLeads.length === 0) {
      setToastMessage('Please select at least one lead to assign to a campaign');
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
      return;
    }
    // Reset campaign search when opening modal
    setCampaignSearchQuery('');
    setSelectedCampaign('');
    setSelectedCampaignName('');
    setShowCampaignDropdown(false);
    setShowCampaignModal(true);
  };

  // Filter campaigns based on search query
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(campaignSearchQuery.toLowerCase())
  );

  // Handle campaign selection from dropdown
  const handleCampaignSelection = (campaign: {id: string, name: string, instantly_id: string}) => {
    setSelectedCampaign(campaign.id);
    setSelectedCampaignName(campaign.name);
    setCampaignSearchQuery(campaign.name);
    setShowCampaignDropdown(false);
  };

  // Handle bulk campaign assignment with upload to Instantly.ai
  const handleBulkCampaignAssignment = async () => {
    console.log('Starting campaign upload for leads:', selectedLeads);
    
    if (!selectedCampaign) {
      setToastMessage('Please select a campaign');
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
      return;
    }

    setIsUploadingToCampaign(true);
    setUploadProgress({ current: 0, total: selectedLeads.length });

    try {
      // Find the selected campaign details
      const selectedCampaignObj = campaigns.find(c => c.id === selectedCampaign);
      const campaignName = selectedCampaignObj?.name || selectedCampaign;
      const campaignInstantlyId = selectedCampaignObj?.instantly_id;
      
      if (!campaignInstantlyId) {
        throw new Error('Campaign instantly_id not found');
      }
      
      console.log('Uploading to campaign:', { 
        campaignId: selectedCampaign, 
        campaignName, 
        instantlyId: campaignInstantlyId 
      });
      
      // Show progress notification
      setToastMessage(`Uploading ${selectedLeads.length} leads to "${campaignName}"...`);
      setIsToastVisible(true);

      // Call the upload API
      const response = await fetch('/api/campaigns/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadIds: selectedLeads,
          campaignId: campaignInstantlyId, // Use instantly_id instead of our internal ID
          campaignName: campaignName
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Upload failed');
      }

      console.log('Upload result:', result);

      // Store results for display
      setUploadResults(result);
      setShowUploadResults(true);
      
      // Close the assignment modal
      setShowCampaignModal(false);
      
      // Refresh leads data to show updated campaign assignments
      await fetchLeads();

      // Clear selections
      setSelectedLeads([]);
      setSelectAll(false);

    } catch (error: any) {
      console.error('Error uploading to campaign:', error);
      setToastMessage('Error uploading to campaign: ' + (error?.message || 'Unknown error occurred'));
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 8000);
    } finally {
      setIsUploadingToCampaign(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  // Handle simple campaign assignment (without upload to Instantly)
  const handleSimpleCampaignAssignment = async () => {
    console.log('Starting simple assignment for leads:', selectedLeads);
    
    if (!selectedCampaign) {
      setToastMessage('Please select a campaign');
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);
      return;
    }

    setIsUploadingToCampaign(true);

    try {
      // Find the selected campaign details
      const selectedCampaignObj = campaigns.find(c => c.id === selectedCampaign);
      const campaignName = selectedCampaignObj?.name || selectedCampaign;
      
      console.log('Assigning campaign:', { campaignId: selectedCampaign, campaignName });

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process leads sequentially to avoid race conditions
      for (let i = 0; i < selectedLeads.length; i++) {
        const leadId = selectedLeads[i];
        try {
          console.log(`Processing lead ${leadId} (${i + 1}/${selectedLeads.length})`);
          await handleCampaignSelect(leadId, selectedCampaign, campaignName, true);
          successCount++;
          
          // Add a small delay between updates
          if (i < selectedLeads.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error: any) {
          errorCount++;
          const errorMsg = error?.message || 'Unknown error';
          console.error(`Failed to assign campaign to lead ${leadId}:`, errorMsg);
          errors.push(`Lead ${leadId}: ${errorMsg}`);
        }
      }

      // Show appropriate success/error message
      if (successCount === selectedLeads.length) {
        setToastMessage(`Successfully assigned ${successCount} lead(s) to "${campaignName}"`);
      } else if (successCount > 0) {
        setToastMessage(`Assigned ${successCount} of ${selectedLeads.length} lead(s) to "${campaignName}". ${errorCount} failed.`);
      } else {
        setToastMessage(`Failed to assign any leads to "${campaignName}". Please try again.`);
      }
      
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);

      // Close modal and clear selections
      setShowCampaignModal(false);
      setSelectedCampaign('');
      setSelectedLeads([]);
      setSelectAll(false);

      // Reset campaign search state
      setCampaignSearchQuery('');
      setSelectedCampaignName('');
      setShowCampaignDropdown(false);

    } catch (error: any) {
      console.error('Error in bulk assignment:', error);
      setToastMessage('Error assigning campaigns: ' + (error?.message || 'Unknown error occurred'));
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
    } finally {
      setIsUploadingToCampaign(false);
    }
  };

  // Handle removing campaign from lead
  const handleRemoveCampaign = async (leadId: string) => {
    try {
      // Set last_modified to current time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${year}-${month}-${day} ${hours}:${minutes}`;

      // Update in Supabase - remove campaign
      const { error } = await supabase
        .from('leads')
        .update({ 
          campaign: null,
          last_modified: currentTime
        })
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      // Find the lead and store old value for undo
      const lead = leads.find(l => l.id === leadId);
      const oldCampaign = lead?.campaign || null;

      // Update local state
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, campaign: '', last_modified: currentTime }
            : lead
        )
      );

      // Add to action history for undo functionality
      const newAction = {
        id: Date.now().toString(),
        leadId: leadId,
        field: 'campaign',
        oldValue: oldCampaign,
        newValue: '',
        timestamp: Date.now()
      };
      setActionHistory(prev => [newAction, ...prev]);

      // Show success message
      setToastMessage(`Campaign removed from lead successfully.`);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);

    } catch (error: any) {
      console.error('Error removing campaign:', error);
      setToastMessage('Error removing campaign: ' + error.message);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
    }
  };

  // Email Enrichment Functions
  const handleEnrichSelected = () => {
    if (selectedLeads.length === 0) return;
    setShowEnrichConfirmModal(true);
  };

  const confirmEnrichment = async () => {
    try {
      setShowEnrichConfirmModal(false);

      // Get the selected leads data to check their email statuses
      const selectedLeadsData = leads.filter(lead => selectedLeads.includes(lead.id));
      
      // Categorize leads by their current status
      const unverifiedLeads = selectedLeadsData.filter(lead => {
        const hasWebsite = lead.website && lead.website.trim() !== '';
        const needsEmail = !lead.email || 
                          lead.email.trim() === '' || 
                          lead.email === 'Not Found' || 
                          lead.email === 'not_found' ||
                          lead.email === 'No email found' ||
                          lead.email === 'Unknown' ||
                          lead.email.toLowerCase().includes('no email') ||
                          lead.email.toLowerCase().includes('not found') ||
                          lead.email.toLowerCase().includes('unknown') ||
                          !lead.email.includes('@');
        const status = lead.email_status?.toLowerCase() || '';
        const isUnverified = status === '' || status === 'unverified' || status === 'not_found' || !lead.email_status;
        return hasWebsite && needsEmail && isUnverified;
      });
      
      const verifiedLeads = selectedLeadsData.filter(lead => {
        const status = lead.email_status?.toLowerCase() || '';
        return status === 'verified' || status === 'deliverable' || status === 'valid';
      });
      
      const invalidLeads = selectedLeadsData.filter(lead => {
        const status = lead.email_status?.toLowerCase() || '';
        return status === 'invalid' || status === 'undeliverable';
      });
      
      const notFoundLeads = selectedLeadsData.filter(lead => {
        const status = lead.email_status?.toLowerCase() || '';
        return status === 'not_found';
      });
      
      // If all leads are unverified, proceed directly
      if (unverifiedLeads.length === selectedLeadsData.length) {
        const leadsToEnrich = unverifiedLeads;
        await startEnrichmentProcess(leadsToEnrich);
        return;
      }
      
      // If there are mixed statuses, show notification
      if (verifiedLeads.length > 0 || invalidLeads.length > 0 || notFoundLeads.length > 0) {
        let message = `Selected leads status breakdown:\n`;
        if (unverifiedLeads.length > 0) message += `• ${unverifiedLeads.length} unverified leads\n`;
        if (verifiedLeads.length > 0) message += `• ${verifiedLeads.length} verified leads\n`;
        if (invalidLeads.length > 0) message += `• ${invalidLeads.length} invalid leads\n`;
        if (notFoundLeads.length > 0) message += `• ${notFoundLeads.length} not found leads\n`;
        message += `\nDo you want to:`;
        
        const choice = confirm(message + `\n\nOK = Enrich only unverified leads (${unverifiedLeads.length})\nCancel = Enrich ALL selected leads (${selectedLeadsData.length})`);
        
        if (choice) {
          // Enrich only unverified
          if (unverifiedLeads.length === 0) {
            setToastMessage('❌ No unverified leads to enrich.');
            setIsToastVisible(true);
            setTimeout(() => setIsToastVisible(false), 3000);
            return;
          }
          await startEnrichmentProcess(unverifiedLeads);
        } else {
          // Enrich all
          await startEnrichmentProcess(selectedLeadsData);
        }
        return;
      }
      
      // Fallback for other cases
      await startEnrichmentProcess(unverifiedLeads);
      
    } catch (error: any) {
      console.error('Error starting enrichment:', error);
      setToastMessage('❌ Failed to start enrichment: ' + error.message);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 5000);
      }
  };

  const startEnrichmentProcess = async (leadsToEnrich: Lead[]) => {
    try {
      // If no leads to enrich, stop here
      if (leadsToEnrich.length === 0) {
        setToastMessage('❌ No leads selected for enrichment.');
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 5000);
        return;
      }

      // Set loading state
      setIsEnriching(true);
      setToastMessage(`🔍 Starting enrichment for ${leadsToEnrich.length} leads...`);
      setIsToastVisible(true);

      // Use the batch endpoint for more reliable processing
      const response = await fetch('/api/enrich-leads/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadIds: leadsToEnrich.map(lead => lead.id),
          batchSize: 2 // Process 2 leads at a time for reliability
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Start progress tracking with the new notification system
        setEnrichmentJobId(data.jobId);
        
        // Show initial message
        setToastMessage(`🔍 Enrichment started for ${leadsToEnrich.length} leads! Check the notification for progress.`);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 3000);
      } else {
        throw new Error(data.error || 'Failed to start enrichment');
      }
    } catch (error: any) {
      console.error('Error during enrichment:', error);
      setToastMessage(`❌ Enrichment failed: ${error.message}`);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
    } finally {
      setIsEnriching(false);
    }
  };

  // LinkedIn Enrichment Functions
  const handleLinkedInEnrich = async () => {
    if (selectedLeads.length === 0) return;
    
    try {
      setToastMessage('🔍 Starting LinkedIn URL enrichment...');
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);

      const response = await fetch('/api/enrich-linkedin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadIds: selectedLeads
        })
      });

      const data = await response.json();

      if (response.ok) {
        setToastMessage(`✅ LinkedIn enrichment completed for ${data.processed} leads!`);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 5000);
        
        // Refresh leads to show updated LinkedIn URLs
        fetchLeads();
        
        // Clear selection
        setSelectedLeads([]);
        setSelectAll(false);
      } else {
        throw new Error(data.error || 'Failed to enrich LinkedIn URLs');
      }
    } catch (error: any) {
      console.error('Error enriching LinkedIn URLs:', error);
      setToastMessage('❌ Failed to enrich LinkedIn URLs: ' + error.message);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
    }
  };

  // Facebook Enrichment Functions
  const handleFacebookEnrich = async () => {
    if (selectedLeads.length === 0) return;
    
    try {
      setToastMessage('🔍 Starting Facebook URL enrichment...');
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);

      const response = await fetch('/api/enrich-facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadIds: selectedLeads
        })
      });

      const data = await response.json();

      if (response.ok) {
        setToastMessage(`✅ Facebook enrichment completed for ${data.processed} leads!`);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 5000);
        
        // Refresh leads to show updated Facebook URLs
        fetchLeads();
        
        // Clear selection
        setSelectedLeads([]);
        setSelectAll(false);
      } else {
        throw new Error(data.error || 'Failed to enrich Facebook URLs');
      }
    } catch (error: any) {
      console.error('Error enriching Facebook URLs:', error);
      setToastMessage('❌ Failed to enrich Facebook URLs: ' + error.message);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
    }
  };

  const handleDeleteLeadsWithoutWebsite = async () => {
    try {
      // Get the selected leads
      const selectedLeadsData = leads.filter(lead => selectedLeads.includes(lead.id));
      const leadsWithoutWebsite = selectedLeadsData.filter(lead => !lead.website || lead.website.trim() === '');
      
      if (leadsWithoutWebsite.length === 0) {
        // No leads without website, proceed with enrichment
        confirmEnrichment();
        return;
      }

      // Delete leads without websites
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .in('id', leadsWithoutWebsite.map(lead => lead.id));

      if (deleteError) {
        throw deleteError;
      }

      // Update local state to remove deleted leads
      setLeads(prevLeads => prevLeads.filter(lead => !leadsWithoutWebsite.some(deletedLead => deletedLead.id === lead.id)));

      // Update selected leads to exclude deleted ones
      const remainingSelectedLeads = selectedLeads.filter(id => !leadsWithoutWebsite.some(deletedLead => deletedLead.id === id));
      setSelectedLeads(remainingSelectedLeads);

      setToastMessage(`🗑️ Deleted ${leadsWithoutWebsite.length} leads without websites`);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 3000);

      // Continue with enrichment for remaining leads
      if (remainingSelectedLeads.length > 0) {
        setTimeout(() => {
          const enrichmentEvent = { target: { value: JSON.stringify({ leadIds: remainingSelectedLeads }) } };
          confirmEnrichment();
        }, 1000);
      }
      
    } catch (error: any) {
      console.error('Error deleting leads without websites:', error);
      setToastMessage('❌ Failed to delete leads: ' + error.message);
      setIsToastVisible(true);
      setTimeout(() => setIsToastVisible(false), 5000);
    }
  };

  const handleEnrichmentComplete = () => {
    setEnrichmentJobId(null);
    setToastMessage('🎉 Email enrichment completed! Refreshing leads...');
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
    
    // Refresh leads to show updated emails
    fetchLeads();
    
    // Clear selection
    setSelectedLeads([]);
    setSelectAll(false);
  };

  const handleEnrichmentCancel = () => {
    setEnrichmentJobId(null);
    setToastMessage('⏹️ Email enrichment cancelled');
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
  };

  // Enrichment completion handler
  const handleEnrichmentComplete = () => {
    setIsEnriching(false);
    fetchLeads(); // Refresh leads data
    setSelectedLeads([]); // Clear selection
    setSelectAll(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showEnrichmentDropdown && !target.closest('.enrichment-dropdown')) {
        setShowEnrichmentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEnrichmentDropdown]);

  // Add custom styles for frozen columns
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .frozen-table-container {
        position: relative;
      }
      .frozen-column {
        position: sticky !important;
        background: white !important;
        box-shadow: 2px 0 4px rgba(0,0,0,0.1) !important;
        z-index: 10 !important;
      }
      .frozen-column-header {
        position: sticky !important;
        background: rgb(249 250 251) !important;
        box-shadow: 2px 0 4px rgba(0,0,0,0.1) !important;
        z-index: 20 !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle URL parameters for email status filtering (from dashboard analytics)
  useEffect(() => {
    const emailStatusParam = searchParams.get('emailStatus');
    if (emailStatusParam) {
      // Use the URL parameter directly since it now matches database values
      setEmailStatusFilter(emailStatusParam);
      // Switch to 'all' view mode to show all fields when filtering
      setViewMode('all');
    }
  }, [searchParams]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);

  // Handle clicking outside campaign dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showCampaignDropdown && !target.closest('.campaign-dropdown-container')) {
        setShowCampaignDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCampaignDropdown]);

  // Handle closing upload results and navigate to campaign
  const handleViewCampaign = () => {
    setShowUploadResults(false);
    setUploadResults(null);
    // Navigate to campaign detail page
    if (selectedCampaign) {
      window.open(`/campaigns/${selectedCampaign}`, '_blank');
    }
  };

  const handleCloseUploadResults = () => {
    setShowUploadResults(false);
    setUploadResults(null);
  };

  // Format upload results for display
  const formatUploadResults = (results: any) => {
    if (!results || !results.lambdaResults) return null;

    const summary = {
      totalRequested: results.totalLeads || 0,
      validLeads: results.validLeads || 0,
      totalSent: 0,
      leadsUploaded: 0,
      inBlocklist: 0,
      skipped: 0,
      invalidEmails: 0,
      duplicateEmails: 0,
      errors: [] as string[]
    };

    results.lambdaResults.forEach((result: any) => {
      const response = result.response;
      if (typeof response === 'object' && response.status === 'success') {
        summary.totalSent += response.total_sent || 0;
        summary.leadsUploaded += response.leads_uploaded || 0;
        summary.inBlocklist += response.in_blocklist || 0;
        summary.skipped += response.skipped_count || 0;
        summary.invalidEmails += response.invalid_email_count || 0;
        summary.duplicateEmails += response.duplicate_email_count || 0;
      } else if (typeof response === 'object' && response.error) {
        summary.errors.push(response.error);
      } else if (typeof response === 'string') {
        // Handle cases where response is a string (like Cloudflare challenges)
        if (response.includes('Cloudflare') || response.includes('Just a moment')) {
          summary.errors.push('API blocked by Cloudflare protection');
        } else {
          summary.errors.push('Unexpected response format');
        }
      }
    });

    return summary;
  };

  // Handle lead update
  const handleLeadUpdate = async (leadId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ [field]: value })
        .eq('id', leadId);

      if (error) throw error;

      // Update the local state
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, [field]: value } : lead
        )
      );

      setToastMessage(`${field} updated successfully`);
    } catch (error) {
      console.error('Error updating lead:', error);
      setToastMessage(`Failed to update ${field}: ${(error as Error)?.message || 'Unknown error'}`);
    }
  };

  // Handle record owner update
  const handleRecordOwnerUpdate = async (leadId: string, newOwnerId: string) => {
    await handleLeadUpdate(leadId, 'record_owner', newOwnerId);
  };

  // Load users for Record Owner filter
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const usersData = await response.json();
          setUsers(usersData);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, []);

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
              <button
                className="bg-yellow-500 text-white p-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                onClick={handleUndo}
                disabled={!canUndo()}
                title="Undo Changes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              
              <Link 
                href="#" 
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                onClick={e => {
                  e.preventDefault();
                  const columns = getCurrentVisibleColumns();
                  const leadsToExport = selectedLeads.length > 0
                    ? getSortedLeads().filter(l => selectedLeads.includes(l.id))
                    : getSortedLeads();
                  downloadCSV(leadsToExport, columns);
                }}
                title="Download CSV"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </Link>
              <div className="relative enrichment-dropdown">
                <button 
                  onClick={() => setShowEnrichmentDropdown(!showEnrichmentDropdown)}
                  className={`bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-1 ${selectedLeads.length === 0 || isEnriching ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={selectedLeads.length === 0 || isEnriching}
                  title={isEnriching ? "Enrichment in progress..." : "Enrichment Options"}
                >
                  {isEnriching ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  <span>{isEnriching ? 'Enriching...' : 'Enrich'}</span>
                  {!isEnriching && (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {showEnrichmentDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <button
                      onClick={() => {
                        setSelectedEnrichmentType('email');
                        setShowEnrichmentDropdown(false);
                        handleEnrichSelected();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-2">
                        <span>✉️</span>
                        <span>Enrich Emails</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEnrichmentType('linkedin');
                        setShowEnrichmentDropdown(false);
                        handleLinkedInEnrich();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-2">
                        <span>💼</span>
                        <span>Enrich LinkedIn URLs</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEnrichmentType('facebook');
                        setShowEnrichmentDropdown(false);
                        handleFacebookEnrich();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-2">
                        <span>📘</span>
                        <span>Enrich Facebook URLs</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <button 
                onClick={openCampaignModal}
                className={`bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 ${selectedLeads.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={selectedLeads.length === 0}
                title="Upload to Campaign"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {selectedLeads.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <p className="text-blue-800">
                <span className="font-bold">{selectedLeads.length}</span> leads selected
              </p>
              <div className="flex space-x-4">
                <button 
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                  onClick={() => {
                    setSelectedLeads([]);
                    setSelectAll(false);
                  }}
                >
                  Unselect All
                </button>
                <button 
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  onClick={handleDeleteSelected}
                >
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search in all fields (name, website, email, address, etc.)"
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg 
              className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filters section */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
              {selectedView && (
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 ml-1">•</span>
                  <span className="text-xs text-gray-600 ml-1">{selectedView.name}</span>
                  {hasViewChanges && (
                    <button
                      className="ml-2 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                      onClick={saveViewChanges}
                    >
                      Save Changes
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="px-2 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 focus:z-10 focus:ring-2 focus:ring-blue-500"
                onClick={() => setShowSaveViewModal(true)}
              >
                Create View
              </button>
              <div className="flex bg-gray-100 rounded">
                <button 
                  className={`px-2 py-0.5 text-xs rounded ${viewMode === 'compact' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                  onClick={() => {
                    setViewMode('compact');
                    setShowLoadViewModal(false);
                    setSelectedView(null);
                    setHasViewChanges(false);
                    setCustomColumns([...defaultCompactColumns]);
                  }}
                >
                  Compact
                </button>
                <button 
                  className={`px-2 py-0.5 text-xs rounded ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                  onClick={() => {
                    setViewMode('all');
                    setShowLoadViewModal(false);
                    setSelectedView(null);
                    setHasViewChanges(false);
                    setCustomColumns([]);
                  }}
                >
                  All Fields
                </button>
                <button 
                  className={`px-2 py-0.5 text-xs rounded ${viewMode === 'custom' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                  onClick={() => setShowLoadViewModal(true)}
                >
                  Custom View
                </button>
              </div>
              {viewMode !== 'all' && (
                <>
                  <button
                    onClick={openColumnsModal}
                    className="bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
                    title="Hide/Show Fields"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </>
              )}
              {/* Pin button - always visible */}
              {/*
              <button 
                onClick={() => setIsNameColumnFrozen(!isNameColumnFrozen)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isNameColumnFrozen 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
                title={isNameColumnFrozen ? "Unfreeze Name Column" : "Freeze Name Column"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              */}
              
              {viewMode === 'all' && (
                <button
                  onClick={openColumnsModal}
                  className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Reorder fields"
                >
                  ↕️ Reorder
                </button>
              )}
            </div>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Row 1 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Country
              </label>
              <select 
                className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              >
                <option value="">All Countries</option>
                {countries.map((country, index) => (
                  <option key={index} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cities
              </label>
              <select 
                className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                value=""
                onChange={(e) => {
                  if (e.target.value && !locationFilter.includes(e.target.value)) {
                    setLocationFilter([...locationFilter, e.target.value]);
                  }
                }}
              >
                <option value="">Select Cities...</option>
                {locations.map((location, index) => (
                  <option key={index} value={location}>{location}</option>
                ))}
              </select>
              {locationFilter.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {locationFilter.map((location) => (
                    <div key={location} className="bg-blue-100 text-blue-800 text-xs font-medium px-1.5 py-0.5 rounded flex items-center">
                      {location}
                      <button 
                        type="button" 
                        onClick={() => setLocationFilter(locationFilter.filter(l => l !== location))}
                        className="ml-1 text-blue-800 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Business Type
              </label>
              <select 
                className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                value=""
                onChange={(e) => {
                  if (e.target.value && !businessTypeFilter.includes(e.target.value)) {
                    setBusinessTypeFilter([...businessTypeFilter, e.target.value]);
                  }
                }}
              >
                <option value="">Select Types...</option>
                {businessTypes.map((type, index) => (
                  <option key={index} value={type}>{type}</option>
                ))}
              </select>
              {businessTypeFilter.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {businessTypeFilter.map((type) => (
                    <div key={type} className="bg-blue-100 text-blue-800 text-xs font-medium px-1.5 py-0.5 rounded flex items-center">
                      {type}
                      <button 
                        type="button" 
                        onClick={() => setBusinessTypeFilter(businessTypeFilter.filter(t => t !== type))}
                        className="ml-1 text-blue-800 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Status
              </label>
              <select 
                className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                value={emailStatusFilter}
                onChange={(e) => setEmailStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {statuses.map((status, index) => (
                  <option key={index} value={status}>{getEmailStatusDisplayName(status)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Chain Status
              </label>
              <select 
                className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                value={chainStatusFilter}
                onChange={(e) => setChainStatusFilter(e.target.value as 'all' | 'chain' | 'independent')}
              >
                <option value="all">All Properties</option>
                <option value="chain">Chain Properties</option>
                <option value="independent">Independent Properties</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Campaign
              </label>
              <select 
                className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
              >
                <option value="">All Campaigns</option>
                {campaignOptions.map((campaign, index) => (
                  <option key={index} value={campaign}>{campaign}</option>
                ))}
              </select>
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Record Owner
              </label>
              <select 
                className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                value={recordOwnerFilter}
                onChange={(e) => setRecordOwnerFilter(e.target.value)}
              >
                <option value="">All Owners</option>
                {recordOwners.map((owner, index) => (
                  <option key={index} value={owner}>{owner}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Created Date Range
              </label>
              <div className="flex space-x-2 items-center">
                <div className="flex-1">
                  <input
                    type="date"
                    className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    value={createdDateFilter.startDate}
                    onChange={(e) => setCreatedDateFilter({ ...createdDateFilter, startDate: e.target.value })}
                    max={createdDateFilter.endDate || undefined}
                  />
                </div>
                <div className="flex items-center text-gray-500 text-xs font-medium">to</div>
                <div className="flex-1">
                  <input
                    type="date"
                    className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    value={createdDateFilter.endDate}
                    onChange={(e) => setCreatedDateFilter({ ...createdDateFilter, endDate: e.target.value })}
                    min={createdDateFilter.startDate || undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Custom filters display */}
          {customFilters.length > 0 && (
            <div className="mt-3">
              <div className="mb-1">
                <span className="text-xs font-medium text-gray-700">Custom Filters:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {customFilters.map((filter, index) => {
                  // Format display text based on operator
                  let displayText = '';
                  
                  if (filter.operator === 'contains') {
                    displayText = `${availableFilterFields.find(f => f.key === filter.field)?.label || filter.field}: ${filter.value}`;
                  } else if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
                    displayText = `${availableFilterFields.find(f => f.key === filter.field)?.label || filter.field} ${filter.operator.replace(/_/g, ' ')}`;
                  } else {
                    displayText = `${availableFilterFields.find(f => f.key === filter.field)?.label || filter.field} ${filter.operator.replace(/_/g, ' ')} ${filter.value}`;
                  }
                  
                  return (
                    <div key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded flex items-center shadow-sm">
                      {displayText}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveCustomFilter(index)}
                        className="ml-1 text-blue-800 hover:text-blue-600"
                        aria-label="Remove filter"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Actions */}
          <div className="mt-3 flex justify-between items-center">
            <CustomFilter
              availableFields={availableFilterFields}
              onAddFilter={handleAddCustomFilter}
              onRemoveFilter={handleRemoveCustomFilter}
              activeFilters={[]}
            />
            
            <button 
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-200 transition-colors duration-200 font-medium"
              onClick={() => {
                setLocationFilter([]);
                setBusinessTypeFilter([]);
                setEmailStatusFilter('');
                setCountryFilter('');
                setCampaignFilter('');
                setRecordOwnerFilter('');
                setCreatedDateFilter({ startDate: '', endDate: '' });
                setChainStatusFilter('all');
                setCustomFilters([]);
                setSearchQuery('');
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Group By and Sort controls */}
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700">Group By:</label>
                <select
                  className="border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                >
                  <option value="">No Grouping</option>
                  <option value="country">Country</option>
                  <option value="city">City</option>
                  <option value="business_type">Business Type</option>
                  <option value="email_status">Email Status</option>
                  <option value="campaign">Campaign</option>
                  <option value="record_owner">Record Owner</option>
                  <option value="chain">Chain Status</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700">Sort By Name:</label>
                <select
                  className="border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'default' | 'asc' | 'desc')}
                >
                  <option value="default">Default Order</option>
                  <option value="asc">Name A-Z</option>
                  <option value="desc">Name Z-A</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Showing {getSortedLeads().length} record{getSortedLeads().length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Table section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {getSortedLeads().length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Checkbox column - always visible */}
                    <th scope="col" className={`w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 ${isNameColumnFrozen ? 'border-r border-gray-300' : ''}`}>
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </th>
                    
                    {viewMode === 'compact' ? (
                      // Render custom columns in compact mode
                      getVisibleColumns(customColumns).map(key => (
                        <th key={key} scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          key === 'name' ? '' : key === 'website' ? 'w-1/6' : ''
                        } ${
                          key === 'name' && isNameColumnFrozen ? 'sticky left-[72px] bg-gray-50 z-10 border-r-2 border-blue-300 shadow-md' : ''
                        }`} style={key === 'name' ? { width: `${nameColumnWidth}px`, minWidth: `${nameColumnWidth}px` } : {}}>
                          {key === 'name' ? (
                            <div className="flex items-center justify-between relative">
                              <span>{getColumnLabel(key)}</span>
                              <div className="flex items-center">
                                <button 
                                  onClick={() => setIsNameColumnFrozen(!isNameColumnFrozen)}
                                  className={`ml-2 p-1 rounded transition-colors duration-200 ${
                                    isNameColumnFrozen 
                                      ? 'text-blue-600 hover:text-blue-700' 
                                      : 'text-gray-400 hover:text-gray-600'
                                  }`}
                                  title={isNameColumnFrozen ? "Unfreeze Name Column" : "Freeze Name Column"}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                </button>
                                {/* Resize handle */}
                                <div 
                                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-75 transition-colors"
                                  onMouseDown={handleMouseDown}
                                  title="Drag to resize column"
                                />
                              </div>
                            </div>
                          ) : (
                            getColumnLabel(key)
                          )}
                        </th>
                      ))
                    ) : viewMode === 'custom' && selectedView ? (
                      // Render selected columns in custom view mode
                      selectedView.filters.customColumns.map(key => (
                        <th key={key} scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          key === 'name' ? '' : key === 'website' ? 'w-1/6' : ''
                        } ${
                          key === 'name' && isNameColumnFrozen ? 'sticky left-[72px] bg-gray-50 z-10 border-r-2 border-blue-300 shadow-md' : ''
                        }`} style={key === 'name' ? { width: `${nameColumnWidth}px`, minWidth: `${nameColumnWidth}px` } : {}}>
                          {key === 'name' ? (
                            <div className="flex items-center justify-between relative">
                              <span>{getColumnLabel(key)}</span>
                              <div className="flex items-center">
                                <button 
                                  onClick={() => setIsNameColumnFrozen(!isNameColumnFrozen)}
                                  className={`ml-2 p-1 rounded transition-colors duration-200 ${
                                    isNameColumnFrozen 
                                      ? 'text-blue-600 hover:text-blue-700' 
                                      : 'text-gray-400 hover:text-gray-600'
                                  }`}
                                  title={isNameColumnFrozen ? "Unfreeze Name Column" : "Freeze Name Column"}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                </button>
                                {/* Resize handle */}
                                <div 
                                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-75 transition-colors"
                                  onMouseDown={handleMouseDown}
                                  title="Drag to resize column"
                                />
                              </div>
                            </div>
                          ) : (
                            getColumnLabel(key)
                          )}
                        </th>
                      ))
                    ) : (
                      // All columns in full view mode
                      <>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          isNameColumnFrozen ? 'sticky left-[72px] bg-gray-50 z-10 border-r-2 border-blue-300 shadow-md' : ''
                        }`} style={{ width: `${nameColumnWidth}px`, minWidth: `${nameColumnWidth}px` }}>
                          <div className="flex items-center justify-between relative">
                            <span>Name</span>
                            <div className="flex items-center">
                              <button 
                                onClick={() => setIsNameColumnFrozen(!isNameColumnFrozen)}
                                className={`ml-2 p-1 rounded transition-colors duration-200 ${
                                  isNameColumnFrozen 
                                    ? 'text-blue-600 hover:text-blue-700' 
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                                title={isNameColumnFrozen ? "Unfreeze Name Column" : "Freeze Name Column"}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                              </button>
                              {/* Resize handle */}
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-75 transition-colors"
                                onMouseDown={handleMouseDown}
                                title="Drag to resize column"
                              />
                            </div>
                          </div>
                        </th>
                        <th scope="col" className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Website
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Country
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          City
                        </th>
                        {viewMode === 'all' && (
                          <>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              POI
                            </th>
                          </>
                        )}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Business Type
                        </th>
                        {viewMode === 'all' && (
                          <>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Facebook URL
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              LinkedIn URL
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Location
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Address
                            </th>
                          </>
                        )}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Record Owner
                        </th>
                        {viewMode === 'all' && (
                          <>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Modified
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bounce Host
                            </th>
                          </>
                        )}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Campaign
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Currency
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Chain
                        </th>
                      </>
                    )}
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupBy === 'none' ? (
                    getSortedLeads().map((lead, idx) => (
                    <tr key={lead.id}>
                      {/* Checkbox column - always visible */}
                      <td className={`w-12 px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-20 ${isNameColumnFrozen ? 'border-r border-gray-300' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => handleSelectLead(lead.id)}
                        />
                      </td>
                      {viewMode === 'compact' ? (
                          getVisibleColumns(customColumns).map(key => (
                          <td key={key} className={`py-3 text-sm text-gray-500 ${
                            key === 'name' ? 'px-4 whitespace-nowrap' : key === 'website' ? 'px-6 max-w-xs truncate' : 'px-6 whitespace-nowrap'
                          } ${
                            key === 'name' && isNameColumnFrozen ? 'sticky left-[72px] bg-white z-10 border-r-2 border-blue-300 shadow-md' : ''
                          }`} style={key === 'name' ? { width: `${nameColumnWidth}px`, minWidth: `${nameColumnWidth}px` } : {}}>
                            {key === 'name' ? renderEditableField(lead, 'name', lead.name) : renderEditableField(lead, key, (lead as any)[key])}
                          </td>
                        ))
                      ) : viewMode === 'custom' && selectedView ? (
                        selectedView.filters.customColumns.map(key => (
                          <td key={key} className={`py-3 text-sm text-gray-500 ${
                            key === 'name' ? 'px-4 whitespace-nowrap' : key === 'website' ? 'px-6 max-w-xs truncate' : 'px-6 whitespace-nowrap'
                          } ${
                            key === 'name' && isNameColumnFrozen ? 'sticky left-[72px] bg-white z-10 border-r-2 border-blue-300 shadow-md' : ''
                          }`} style={key === 'name' ? { width: `${nameColumnWidth}px`, minWidth: `${nameColumnWidth}px` } : {}}>
                            {key === 'name' ? renderEditableField(lead, 'name', lead.name) : renderEditableField(lead, key, (lead as any)[key])}
                          </td>
                        ))
                      ) : (
                        // All columns in full view mode
                        <>
                          <td className={`py-3 px-4 text-sm text-gray-500 whitespace-nowrap ${
                            isNameColumnFrozen ? 'sticky left-[72px] bg-white z-10 border-r-2 border-blue-300 shadow-md' : ''
                          }`} style={{ width: `${nameColumnWidth}px`, minWidth: `${nameColumnWidth}px` }}>
                            {renderEditableField(lead, 'name', lead.name)}
                          </td>
                          <td className="px-6 py-4 text-sm max-w-xs break-words">
                            {renderEditableField(lead, 'website', lead.website)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderEditableField(lead, 'email', lead.email)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderEditableField(lead, 'email_status', lead.email_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderEditableField(lead, 'phone', lead.phone)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderEditableField(lead, 'country', lead.country)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderEditableField(lead, 'city', lead.city)}
                          </td>
                          {viewMode === 'all' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {renderEditableField(lead, 'poi', lead.poi)}
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderEditableField(lead, 'business_type', lead.business_type)}
                          </td>
                          {viewMode === 'all' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {renderEditableField(lead, 'facebook_url', lead.facebook_url)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {renderEditableField(lead, 'linkedin_url', lead.linkedin_url)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {renderEditableField(lead, 'location', lead.location)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {renderEditableField(lead, 'address', lead.address, true)}
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderEditableField(lead, 'created_at', lead.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <RecordOwnerDisplay
                              ownerId={lead.record_owner}
                              isEditing={false}
                              onSave={(newOwnerId) => handleRecordOwnerUpdate(lead.id, newOwnerId)}
                              className="min-w-0"
                            />
                          </td>
                          {viewMode === 'all' && (
                              <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {renderEditableField(lead, 'last_modified', lead.last_modified)}
                            </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={lead.bounce_host === 'true'} 
                                    onChange={async (e) => {
                                      const newValue = e.target.checked ? 'true' : 'false';
                                      try {
                                        // Set last_modified to current UK local time in simple format (YYYY-MM-DD HH:MM)
                                        const now = new Date();
                                        const year = now.getFullYear();
                                        const month = String(now.getMonth() + 1).padStart(2, '0');
                                        const day = String(now.getDate()).padStart(2, '0');
                                        const hours = String(now.getHours()).padStart(2, '0');
                                        const minutes = String(now.getMinutes()).padStart(2, '0');
                                        const currentTime = `${year}-${month}-${day} ${hours}:${minutes}`;
                                        
                                        // Update in Supabase with last_modified
                                        const { error } = await supabase
                                          .from('leads')
                                          .update({ bounce_host: newValue, last_modified: currentTime })
                                          .eq('id', lead.id);

                                        if (error) {
                                          throw error;
                                        }

                                        // Update local state
                                      const updatedLeads = leads.map(l => 
                                          l.id === lead.id ? {...l, bounce_host: newValue, last_modified: currentTime} : l
                                      );
                                      setLeads(updatedLeads);

                                        setToastMessage('Bounce host status updated');
                                        setIsToastVisible(true);
                                        setTimeout(() => setIsToastVisible(false), 2000);

                                      } catch (error: any) {
                                        console.error('Error updating bounce host:', {
                                          leadId: lead.id,
                                          newValue: newValue,
                                          error: error?.message || 'Unknown error',
                                          stack: error?.stack
                                        });
                                        setToastMessage('Error updating bounce host: ' + (error?.message || 'Unknown error occurred'));
                                        setIsToastVisible(true);
                                        setTimeout(() => setIsToastVisible(false), 5000);
                                      }
                                    }}
                                  />
                                </td>
                              </>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {renderEditableField(lead, 'campaign', lead.campaign || '')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {renderEditableField(lead, 'currency', lead.currency)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                detectChainStatus(lead.website, chainEntries) 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {detectChainStatus(lead.website, chainEntries) ? 'Chain' : 'Independent'}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className="text-red-600 hover:text-red-900"
                            onClick={() => {
                              setContactToDelete(lead.id);
                              setShowSingleDeleteModal(true);
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    Object.entries(groupLeads(getSortedLeads(), groupBy)).map(([group, leads]) => (
                      <React.Fragment key={group}>
                        {groupBy !== 'none' && (
                          <tr
                            onClick={() => toggleGroup(group)}
                            className="cursor-pointer select-none group-header-row hover:bg-gray-200 transition-colors"
                          >
                            <td
                              colSpan={100}
                              className="bg-gray-100 text-gray-700 font-semibold px-3 py-1 border-b border-gray-200"
                              style={{ fontSize: '0.95rem', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}
                            >
                              <span className="mr-2 text-base" style={{ display: 'inline-block', width: 18, textAlign: 'center' }}>
                                {expandedGroups[group] ? '▼' : '▶'}
                              </span>
                              <span>{group} <span className="ml-1 text-xs text-gray-500 font-normal">({leads.length})</span></span>
                            </td>
                          </tr>
                        )}
                        {expandedGroups[group] && leads.map((lead) => (
                          <tr key={lead.id} className="grouped-row">
                            {/* Checkbox column - always visible */}
                            <td className={`w-12 px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-20 ${isNameColumnFrozen ? 'border-r border-gray-300' : ''}`}>
                              <input 
                                type="checkbox" 
                                checked={selectedLeads.includes(lead.id)}
                                onChange={() => handleSelectLead(lead.id)}
                              />
                            </td>
                            {viewMode === 'compact' ? (
                              getVisibleColumns(customColumns).map(key => (
                                <td key={key} className={`py-3 text-sm text-gray-500 ${
                                  key === 'name' ? 'px-4 whitespace-nowrap' : key === 'website' ? 'px-6 max-w-xs truncate' : 'px-6 whitespace-nowrap'
                                } ${
                                  key === 'name' && isNameColumnFrozen ? 'sticky left-[72px] bg-white z-10 border-r-2 border-blue-300 shadow-md' : ''
                                }`} style={key === 'name' ? { width: `${nameColumnWidth}px`, minWidth: `${nameColumnWidth}px` } : {}}>
                                  {key === 'name' ? renderEditableField(lead, 'name', lead.name) : renderEditableField(lead, key, (lead as any)[key])}
                                </td>
                              ))
                            ) : viewMode === 'custom' && selectedView ? (
                              selectedView.filters.customColumns.map(key => (
                                <td key={key} className={`px-6 py-4 text-sm text-gray-500 ${
                                  key === 'name' || key === 'website' ? 'max-w-xs break-words' : 'whitespace-nowrap'
                                } ${
                                  key === 'name' && isNameColumnFrozen ? 'sticky left-[72px] bg-white z-10 border-r-2 border-blue-300 shadow-md' : ''
                                }`}>
                                  {renderEditableField(lead, key, (lead as any)[key])}
                                </td>
                              ))
                            ) : (
                              // All columns in full view mode
                              <>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-words">
                                  {renderEditableField(lead, 'name', lead.name)}
                                </td>
                                <td className="px-6 py-4 text-sm max-w-xs break-words">
                                  {renderEditableField(lead, 'website', lead.website)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {renderEditableField(lead, 'email', lead.email)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {renderEditableField(lead, 'email_status', lead.email_status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {renderEditableField(lead, 'phone', lead.phone)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {renderEditableField(lead, 'country', lead.country)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {renderEditableField(lead, 'city', lead.city)}
                                </td>
                                {viewMode === 'all' && (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {renderEditableField(lead, 'poi', lead.poi)}
                                    </td>
                                  </>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {renderEditableField(lead, 'business_type', lead.business_type)}
                                </td>
                                {viewMode === 'all' && (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {renderEditableField(lead, 'facebook_url', lead.facebook_url)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {renderEditableField(lead, 'linkedin_url', lead.linkedin_url)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {renderEditableField(lead, 'location', lead.location)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {renderEditableField(lead, 'address', lead.address, true)}
                                    </td>
                                  </>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {renderEditableField(lead, 'created_at', lead.created_at)}
                                </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <RecordOwnerDisplay
                              ownerId={lead.record_owner}
                              isEditing={false}
                              onSave={(newOwnerId) => handleRecordOwnerUpdate(lead.id, newOwnerId)}
                              className="min-w-0"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderEditableField(lead, 'email', lead.email)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderEditableField(lead, 'email_status', lead.email_status)}
                          </td>
                          {viewMode === 'all' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {renderEditableField(lead, 'last_modified', lead.last_modified)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                <input 
                                  type="checkbox" 
                                  checked={lead.bounce_host === 'true'} 
                                  onChange={async (e) => {
                                    const newValue = e.target.checked ? 'true' : 'false';
                                    try {
                                      // Set last_modified to current UK local time in simple format (YYYY-MM-DD HH:MM)
                                      const now = new Date();
                                      const year = now.getFullYear();
                                      const month = String(now.getMonth() + 1).padStart(2, '0');
                                      const day = String(now.getDate()).padStart(2, '0');
                                      const hours = String(now.getHours()).padStart(2, '0');
                                      const minutes = String(now.getMinutes()).padStart(2, '0');
                                      const currentTime = `${year}-${month}-${day} ${hours}:${minutes}`;
                                      
                                      // Update in Supabase with last_modified
                                      const { error } = await supabase
                                        .from('leads')
                                        .update({ bounce_host: newValue, last_modified: currentTime })
                                        .eq('id', lead.id);

                                      if (error) {
                                        throw error;
                                      }

                                      // Update local state
                                    const updatedLeads = leads.map(l => 
                                        l.id === lead.id ? {...l, bounce_host: newValue, last_modified: currentTime} : l
                                    );
                                    setLeads(updatedLeads);

                                      setToastMessage('Bounce host status updated');
                                      setIsToastVisible(true);
                                      setTimeout(() => setIsToastVisible(false), 2000);

                                    } catch (error: any) {
                                      console.error('Error updating bounce host:', {
                                        leadId: lead.id,
                                        newValue: newValue,
                                        error: error?.message || 'Unknown error',
                                        stack: error?.stack
                                      });
                                      setToastMessage('Error updating bounce host: ' + (error?.message || 'Unknown error occurred'));
                                      setIsToastVisible(true);
                                      setTimeout(() => setIsToastVisible(false), 5000);
                                    }
                                  }}
                                />
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderEditableField(lead, 'campaign', lead.campaign || '')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderEditableField(lead, 'currency', lead.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              detectChainStatus(lead.website, chainEntries) 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {detectChainStatus(lead.website, chainEntries) ? 'Chain' : 'Independent'}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          className="text-red-600 hover:text-red-900"
                          onClick={() => {
                            setContactToDelete(lead.id);
                            setShowSingleDeleteModal(true);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">No leads found matching your filters.</p>
            </div>
          )}
        </div>

        {/* Customize Columns Modal - Airtable Style */}
        {showColumnsModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {viewMode === 'all' ? 'Reorder Fields' : 'Hide and reorder fields'}
                </h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={closeColumnsModal}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Find a field"
                    className="w-full pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchFieldQuery}
                    onChange={(e) => setSearchFieldQuery(e.target.value)}
                  />
                  <svg 
                    className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Visible Fields Count */}
              <div className="mb-2 text-xs text-gray-500">
                {viewMode === 'all' ? 
                  `All ${tempColumns.length} fields visible` : 
                  `${tempColumns.length} visible fields out of ${availableColumns.length - 1}`
                }
              </div>

              {/* Fields List */}
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {tempColumns
                  .filter(key => getColumnInfo(key).label.toLowerCase().includes(searchFieldQuery.toLowerCase()) || 
                               key.toLowerCase().includes(searchFieldQuery.toLowerCase()))
                  .map((key, index) => {
                    const column = getColumnInfo(key);
                    const isDragging = draggedColumn === key;
                    const isOver = dragOverIndex === index;
                    
                    return (
                      <div
                        key={key}
                        draggable
                        onDragStart={(e) => handleDragStart(e, key, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center p-3 rounded-md border transition-all duration-200 ${
                          isDragging 
                            ? 'opacity-50 bg-blue-100 border-blue-300' 
                            : isOver 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {/* Toggle Switch (only for compact/custom view) */}
                        {viewMode !== 'all' && (
                          <div 
                            className="mr-3 cursor-pointer"
                            onClick={() => toggleColumn(key)}
                          >
                            <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${
                              true ? 'bg-green-500' : 'bg-gray-300'
                            }`}>
                              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                                true ? 'transform translate-x-4' : ''
                              }`}></div>
                            </div>
                          </div>
                        )}

                        {/* Field Icon */}
                        <div className="mr-3 text-lg">
                          {column.icon}
                        </div>

                        {/* Field Info */}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{column.label}</div>
                        </div>

                        {/* Drag Handle */}
                        <div className="ml-2 cursor-move text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Hidden Fields Section (only for compact/custom view) */}
              {viewMode !== 'all' && getFilteredAvailableColumns().length > 0 && (
                <div className="mt-6">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    {getFilteredAvailableColumns().length} hidden fields
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {getFilteredAvailableColumns().map((column) => (
                      <div
                        key={column.key}
                        className="flex items-center p-2 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                      >
                        {/* Toggle Switch - OFF */}
                        <div 
                          className="mr-3 cursor-pointer"
                          onClick={() => toggleColumn(column.key)}
                        >
                          <div className="w-10 h-6 bg-gray-300 rounded-full relative transition-colors duration-200">
                            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200"></div>
                          </div>
                        </div>

                        {/* Field Icon */}
                        <div className="mr-3 text-lg opacity-60">
                          {column.icon}
                        </div>

                        {/* Field Info */}
                        <div className="flex-1">
                          <div className="font-medium text-gray-600">{column.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  {viewMode !== 'all' && (
                    <>
                      <button
                        className="px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={() => {
                          const allColumnKeys = availableColumns.map(col => col.key).filter(key => key !== 'id');
                          setTempColumns(allColumnKeys);
                        }}
                      >
                        Show all
                      </button>
                      <button
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        onClick={() => {
                          setTempColumns(['name', 'website', 'email', 'email_status', 'phone']);
                        }}
                      >
                        Hide all
                      </button>
                    </>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={cancelColumnChanges}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={applyColumnChanges}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Selected Leads</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 mb-4">
                    You are about to delete <span className="font-bold text-red-600">{selectedLeads.length}</span> leads. This action cannot be undone.
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Please type <span className="font-bold">{selectedLeads.length}</span> to confirm:
                  </p>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder={`Type ${selectedLeads.length} to confirm`}
                    autoFocus
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmation('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={`px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      deleteConfirmation !== selectedLeads.length.toString() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={confirmDelete}
                    disabled={deleteConfirmation !== selectedLeads.length.toString()}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Undo Toast */}
        {showUndoToast && (
          <div className="fixed bottom-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg z-50 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span>{undoMessage}</span>
          </div>
        )}
        
        {/* Save View Modal */}
        {showSaveViewModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Save Current View</h3>
                <div className="mt-2">
                  <div className="mb-4">
                    <label htmlFor="viewName" className="block text-sm font-medium text-gray-700">View Name</label>
                    <input
                      type="text"
                      id="viewName"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
                      placeholder="Enter a name for this view"
                    />
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center">
                      <input
                        id="isPublic"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={isPublicView}
                        onChange={(e) => setIsPublicView(e.target.checked)}
                      />
                      <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                        Make this view public (visible to all team members)
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={() => {
                      setShowSaveViewModal(false);
                      setNewViewName('');
                      setIsPublicView(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={`px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !newViewName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={saveCurrentView}
                    disabled={!newViewName.trim()}
                  >
                    Save View
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Load View Modal */}
        {showLoadViewModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-3/4 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Load Saved View</h3>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setShowLoadViewModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {savedViews.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No saved views found. Create a view to see it here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {savedViews.map(view => (
                      <div key={view.id} className="border rounded-md p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-md font-medium">{view.name}</h4>
                            <p className="text-sm text-gray-500">
                              Created by {view.createdBy} on {new Date(view.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {view.filters.customColumns.length} columns • {view.filters.viewMode} view
                            </p>
                            <p className="text-xs text-gray-500">
                              {view.filters.locationFilter.length + view.filters.businessTypeFilter.length + view.filters.customFilters.length} filters applied
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => applySavedView(view)}
                              title="Apply this view"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={() => deleteSavedView(view)}
                              title="Delete this view"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {view.isPublic && (
                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Public
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Delete View Confirmation Modal */}
        {viewToDelete && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Saved View</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Are you sure you want to delete the view <span className="font-bold">{viewToDelete.name}</span>?
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={() => setViewToDelete(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onClick={confirmDeleteView}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Single Contact Delete Modal */}
        {showSingleDeleteModal && contactToDelete && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Contact</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Are you sure you want to delete this contact?
                  </p>
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={() => {
                      setShowSingleDeleteModal(false);
                      setContactToDelete(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onClick={() => {
                      handleDeleteLead(contactToDelete);
                      setShowSingleDeleteModal(false);
                      setContactToDelete(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Assignment Modal */}
        {showCampaignModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 mb-4">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
      </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Upload to Campaign</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 mb-4">
                    You are about to upload <span className="font-bold text-purple-600">{selectedLeads.length}</span> leads to Instantly.ai campaign.
                  </p>

                  <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mb-4">
                    <h4 className="text-sm font-medium text-purple-900 mb-1">What happens:</h4>
                    <div className="text-xs text-purple-800">
                      <p>• Leads are assigned to the campaign in your database</p>
                      <p>• Leads are uploaded to Instantly.ai for email outreach</p>
                      <p>• You'll see detailed upload results and statistics</p>
                    </div>
                  </div>
                  
                  {campaigns.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="text-gray-500">Loading campaigns...</div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Campaign:
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        📍 Only Live campaigns are shown (archived campaigns excluded)
                      </p>
                      <div className="relative campaign-dropdown-container">
                        <input
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          placeholder="Search live campaigns..."
                          value={campaignSearchQuery}
                          onChange={(e) => {
                            setCampaignSearchQuery(e.target.value);
                            setShowCampaignDropdown(true);
                            // Clear selection if user types something different
                            if (e.target.value !== selectedCampaignName) {
                              setSelectedCampaign('');
                              setSelectedCampaignName('');
                            }
                          }}
                          onFocus={() => setShowCampaignDropdown(true)}
                        />
                        
                        {/* Show checkmark when campaign is selected */}
                        {selectedCampaign && campaignSearchQuery === selectedCampaignName && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        
                        {showCampaignDropdown && (campaignSearchQuery.trim() === '' ? campaigns : filteredCampaigns).length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                            {(campaignSearchQuery.trim() === '' ? campaigns : filteredCampaigns).map((campaign) => (
                              <div
                                key={campaign.id}
                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-purple-50 hover:text-purple-900"
                                onClick={() => handleCampaignSelection(campaign)}
                              >
                                <span className="block truncate font-normal">
                                  {campaign.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {showCampaignDropdown && campaignSearchQuery && filteredCampaigns.length === 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5">
                            <div className="py-2 pl-3 pr-9 text-gray-500 text-sm">
                              No campaigns found matching "{campaignSearchQuery}"
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-2 space-x-3">
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={() => {
                      setShowCampaignModal(false);
                      setSelectedCampaign('');
                      setSelectedCampaignName('');
                      setCampaignSearchQuery('');
                      setShowCampaignDropdown(false);
                    }}
                    disabled={isUploadingToCampaign}
                  >
                    Cancel
                  </button>

                  {/* Upload to Instantly Button */}
                  <button
                    className={`px-6 py-2 bg-purple-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      !selectedCampaign || isUploadingToCampaign ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={handleBulkCampaignAssignment}
                    disabled={!selectedCampaign || isUploadingToCampaign}
                    title="Upload leads to Instantly.ai campaign"
                  >
                    {isUploadingToCampaign ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading to Instantly...
                      </div>
                    ) : (
                      'Upload to Campaign'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enrichment Confirmation Modal */}
        {showEnrichConfirmModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Email Enrichment</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 mb-4">
                    You have selected <span className="font-bold text-green-600">{selectedLeads.length}</span> leads for email enrichment.
                  </p>
                  
                  {(() => {
                    const selectedLeadsData = leads.filter(lead => selectedLeads.includes(lead.id));
                    
                    // Use the same filtering logic as the actual enrichment
                    const leadsToEnrich = selectedLeadsData.filter(lead => {
                      // Must have website
                      const hasWebsite = lead.website && lead.website.trim() !== '';
                      
                      // Must not have email or have "not found" email
                      const needsEmail = !lead.email || 
                                        lead.email.trim() === '' || 
                                        lead.email === 'Not Found' || 
                                        lead.email === 'not_found' ||
                                        lead.email === 'No email found' ||
                                        lead.email === 'Unknown' ||
                                        lead.email.toLowerCase().includes('no email') ||
                                        lead.email.toLowerCase().includes('not found') ||
                                        lead.email.toLowerCase().includes('unknown') ||
                                        !lead.email.includes('@');
                      
                      // Must be unverified status OR not_found (can be re-enriched)
                      const status = lead.email_status?.toLowerCase() || '';
                      const isUnverified = status === '' || status === 'unverified' || status === 'not_found' || !lead.email_status;
                      
                      return hasWebsite && needsEmail && isUnverified;
                    });
                    
                    // Count different categories
                    const leadsWithoutWebsite = selectedLeadsData.filter(lead => !lead.website || lead.website.trim() === '');
                    const verifiedLeads = selectedLeadsData.filter(lead => {
                      const status = lead.email_status?.toLowerCase() || '';
                      return status === 'verified' || status === 'deliverable' || status === 'valid';
                    });
                    
                    const invalidLeads = selectedLeadsData.filter(lead => {
                      const status = lead.email_status?.toLowerCase() || '';
                      return status === 'invalid' || status === 'undeliverable';
                    });
                    
                    const notFoundLeads = selectedLeadsData.filter(lead => {
                      const status = lead.email_status?.toLowerCase() || '';
                      return status === 'not_found';
                    });
                    const leadsWithEmails = selectedLeadsData.filter(lead => 
                      lead.email && 
                      lead.email.trim() !== '' && 
                      lead.email !== 'Not Found' && 
                      lead.email !== 'not_found' &&
                      lead.email !== 'No email found' &&
                      lead.email !== 'Unknown' &&
                      !lead.email.toLowerCase().includes('no email') &&
                      !lead.email.toLowerCase().includes('not found') &&
                      !lead.email.toLowerCase().includes('unknown') &&
                      lead.email.includes('@')  // Must be a valid email format
                    );

                    return (
                      <>
                        {leadsWithoutWebsite.length > 0 && (
                          <div className="bg-red-50 p-3 rounded-lg mb-4 text-left">
                            <div className="text-xs text-red-800 font-medium mb-2">⚠️ Cannot Enrich:</div>
                            <div className="text-xs text-red-700">
                              <span className="font-bold">{leadsWithoutWebsite.length}</span> leads don't have websites and cannot be enriched.
                            </div>
                          </div>
                        )}
                        
                        {verifiedLeads.length > 0 && (
                          <div className="bg-blue-50 p-3 rounded-lg mb-4 text-left">
                            <div className="text-xs text-blue-800 font-medium mb-1">✅ Already Verified:</div>
                            <div className="text-xs text-blue-700">
                              <span className="font-bold">{verifiedLeads.length}</span> leads already have verified emails.
                            </div>
                          </div>
                        )}
                        
                        {invalidLeads.length > 0 && (
                          <div className="bg-red-50 p-3 rounded-lg mb-4 text-left">
                            <div className="text-xs text-red-800 font-medium mb-1">❌ Invalid Emails:</div>
                            <div className="text-xs text-red-700">
                              <span className="font-bold">{invalidLeads.length}</span> leads have invalid emails.
                            </div>
                          </div>
                        )}
                        


                        {leadsWithEmails.length > 0 && (
                          <div className="bg-blue-50 p-3 rounded-lg mb-4 text-left">
                            <div className="text-xs text-blue-800 font-medium mb-1">ℹ️ Already Have Emails:</div>
                            <div className="text-xs text-blue-700">
                              <span className="font-bold">{leadsWithEmails.length}</span> leads already have emails (will be re-enriched).
                            </div>
                          </div>
                        )}
                        


                        {leadsToEnrich.length > 0 && (
                          <div className="bg-yellow-50 p-3 rounded-lg mb-4 text-left">
                            <div className="text-xs text-yellow-800 font-medium mb-1">⏱️ Estimated Time:</div>
                            <div className="text-xs text-yellow-700">
                              ~{Math.ceil(leadsToEnrich.length * 5 / 60)} minutes for {leadsToEnrich.length} leads
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                
                {(() => {
                  const selectedLeadsData = leads.filter(lead => selectedLeads.includes(lead.id));
                  const leadsWithoutWebsite = selectedLeadsData.filter(lead => !lead.website || lead.website.trim() === '');
                  
                  // Define status categories for button logic
                  const verifiedLeads = selectedLeadsData.filter(lead => {
                    const status = lead.email_status?.toLowerCase() || '';
                    return status === 'verified' || status === 'deliverable' || status === 'valid';
                  });
                  
                  const invalidLeads = selectedLeadsData.filter(lead => {
                    const status = lead.email_status?.toLowerCase() || '';
                    return status === 'invalid' || status === 'undeliverable';
                  });
                  
                  const notFoundLeads = selectedLeadsData.filter(lead => {
                    const status = lead.email_status?.toLowerCase() || '';
                    return status === 'not_found';
                  });
                  
                  if (leadsWithoutWebsite.length > 0) {
                    return (
                      <div className="flex flex-col space-y-2 mt-2">
                        <button
                          className="w-full px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                          onClick={handleDeleteLeadsWithoutWebsite}
                        >
                          Delete leads without websites & Start Enrichment
                        </button>
                        <button
                          className="w-full px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                          onClick={confirmEnrichment}
                        >
                          Keep all leads & Start Enrichment
                        </button>
                        <button
                          className="w-full px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                          onClick={() => setShowEnrichConfirmModal(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  } else {
                    // Simple approach - just show count and enrich what's selected
                    const eligibleLeads = selectedLeadsData.filter(lead => {
                      return lead.website && lead.website.trim() !== '';
                    });
                    
                    return (
                      <div className="flex justify-end mt-2">
                        <button
                          className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                          onClick={() => setShowEnrichConfirmModal(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                          onClick={() => {
                            setShowEnrichConfirmModal(false);
                            startEnrichmentProcess(eligibleLeads);
                          }}
                        >
                          Start Enrichment ({eligibleLeads.length} leads)
                        </button>
                      </div>
                    );
                  }
                  


                })()}
              </div>
            </div>
          </div>
        )}

        {/* Upload Results Modal */}
        {showUploadResults && uploadResults && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-6 border w-[600px] shadow-lg rounded-md bg-white">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <h3 className="text-xl leading-6 font-bold text-gray-900 mb-2">Campaign Upload Complete!</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Leads have been successfully uploaded to {selectedCampaignName}
                </p>
                
                {(() => {
                  const summary = formatUploadResults(uploadResults);
                  if (!summary) return null;
                  
                  return (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Requested:</span>
                            <span className="font-semibold text-gray-900">{summary.totalRequested}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Valid Leads:</span>
                            <span className="font-semibold text-blue-600">{summary.validLeads}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Sent:</span>
                            <span className="font-semibold text-green-600">{summary.totalSent}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Uploaded:</span>
                            <span className="font-semibold text-purple-600">{summary.leadsUploaded}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">In Blocklist:</span>
                            <span className="font-semibold text-red-600">{summary.inBlocklist}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Skipped:</span>
                            <span className="font-semibold text-yellow-600">{summary.skipped}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Invalid Emails:</span>
                            <span className="font-semibold text-red-500">{summary.invalidEmails}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Duplicates:</span>
                            <span className="font-semibold text-orange-600">{summary.duplicateEmails}</span>
                          </div>
                        </div>
                      </div>
                      
                      {summary.errors.length > 0 && (
                        <div className="mt-4 p-3 bg-red-50 rounded border-l-4 border-red-400">
                          <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                          <ul className="text-xs text-red-700 space-y-1">
                            {summary.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {summary.totalSent > 0 && (
                        <div className="mt-4 p-3 bg-green-50 rounded border-l-4 border-green-400">
                          <p className="text-sm text-green-800">
                            ✅ <strong>{summary.totalSent}</strong> leads successfully processed by Instantly.ai
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                <div className="flex justify-center space-x-3">
                  <button
                    className="px-6 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={handleCloseUploadResults}
                  >
                    Close
                  </button>
                  <button
                    className="px-6 py-2 bg-purple-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onClick={handleViewCampaign}
                  >
                    View Campaign
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

            {/* Enrichment Notification */}
      <EnrichmentNotification 
        jobId={enrichmentJobId}
        onComplete={handleEnrichmentComplete}
        onCancel={handleEnrichmentCancel}
      />

      {/* Progress Notification */}
      <EnrichmentProgressNotification 
        jobId={enrichmentJobId}
        onClose={() => {
          setEnrichmentJobId(null);
          fetchLeads(); // Refresh leads data
          setSelectedLeads([]); // Clear selection
          setSelectAll(false);
        }}
      />

      <Toast />
    </div>
  );
}
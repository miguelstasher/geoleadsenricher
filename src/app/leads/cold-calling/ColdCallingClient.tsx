'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import CustomFilter from '../../components/CustomFilter';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';
import RecordOwnerDisplay from '../../components/RecordOwnerDisplay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cold Calling Lead type - focused on phone-based leads
type ColdCallingLead = {
  id: string;
  name: string;
  phone: string;
  country: string;
  city: string;
  poi: string;
  business_type: string;
  location: string;
  address: string;
  created_at: string;
  record_owner: string;
  last_modified: string;
  currency: string;
  // Contact tracking fields
  contacted: boolean;
  first_contacted_date: string | null;
  notes: string;
  // Note: Excluding website, email, campaign fields as these are not relevant for cold calling
};

// Cold calling focused columns - no website, email, or campaign fields
const coldCallingColumns = ['name', 'phone', 'country', 'city', 'business_type', 'poi', 'address', 'currency', 'record_owner', 'contacted', 'first_contacted_date', 'notes'];
const defaultColdCallingColumns = ['name', 'phone', 'country', 'city', 'business_type', 'contacted', 'notes'];

export default function ColdCallingClient() {
  const [leads, setLeads] = useState<ColdCallingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  
  // View and column states
  const [viewMode, setViewMode] = useState<'default' | 'compact' | 'custom'>('default');
  const [customColumns, setCustomColumns] = useState<string[]>(defaultColdCallingColumns);
  
  // Filter states (simplified for cold calling)
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState('');
  const [recordOwnerFilter, setRecordOwnerFilter] = useState('');
  const [contactedFilter, setContactedFilter] = useState<'all' | 'contacted' | 'not_contacted'>('all');
  const [customFilters, setCustomFilters] = useState<{field: string, operator: string, value: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection states
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Notes editing state
  const [editingNotes, setEditingNotes] = useState<{[leadId: string]: string}>({});
  const [notesTimeouts, setNotesTimeouts] = useState<{[leadId: string]: NodeJS.Timeout}>({});

  // Fetch cold calling leads (leads without websites but with phone numbers)
  const fetchColdCallingLeads = async () => {
    try {
      setLoading(true);
      
      // Try to query cold_calling_leads table first
      let data = null;
      let error = null;
      
      try {
        const result = await supabase
          .from('cold_calling_leads')
          .select('*')
          .order('created_at', { ascending: false });
        
        data = result.data;
        error = result.error;
      } catch (tableError) {
        // Table doesn't exist, use fallback
        error = tableError;
      }
      
      if (error || !data) {
        console.log('Using fallback method: querying leads table with lead_type flag');
        // Fallback: query regular leads table with lead_type flag or filter criteria
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('leads')
          .select(`
            id, name, phone, country, city, poi, business_type, 
            location, address, created_at, record_owner, 
            last_modified, currency,
            contacted, first_contacted_date, notes
          `)
          .or('lead_type.eq.cold_calling,and(phone.not.is.null,phone.neq.,or(website.is.null,website.eq.))')
          .order('created_at', { ascending: false });
          
        if (fallbackError) {
          throw fallbackError;
        }
        setLeads(fallbackData || []);
        
        // Initialize editing notes state for fallback data
        if (fallbackData && fallbackData.length > 0) {
          const initialNotesState: {[leadId: string]: string} = {};
          fallbackData.forEach(lead => {
            initialNotesState[lead.id] = lead.notes || '';
          });
          setEditingNotes(initialNotesState);
        }
      } else {
        setLeads(data || []);
        
        // Initialize editing notes state for all leads
        if (data && data.length > 0) {
          const initialNotesState: {[leadId: string]: string} = {};
          data.forEach(lead => {
            initialNotesState[lead.id] = lead.notes || '';
          });
          setEditingNotes(initialNotesState);
        }
      }
      
    } catch (error) {
      console.error('Error fetching cold calling leads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for record owner display
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchColdCallingLeads();
    fetchUsers();
    
    // Cleanup timeouts on unmount
    return () => {
      Object.values(notesTimeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Helper function to get user name from user ID
  const getUserName = (userId: string): string => {
    if (!users || users.length === 0) return 'Loading...';
    const user = users.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
  };

  // Filter leads based on current filters
  const filteredLeads = leads.filter(lead => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableFields = [
        lead.name, lead.phone, lead.country, lead.city, 
        lead.business_type, lead.poi, lead.address
      ];
      
      const matchesSearch = searchableFields.some(field => 
        field && field.toString().toLowerCase().includes(query)
      );
      
      if (!matchesSearch) return false;
    }

    // Apply custom filters
    if (customFilters.length > 0) {
      const passesCustomFilters = customFilters.every(filter => {
        const fieldValue = (lead as any)[filter.field];
        
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
          case 'is_any_of': {
            try {
              const values = JSON.parse(filter.value);
              if (!Array.isArray(values)) return false;
              
              if (filter.field === 'record_owner') {
                const leadOwnerName = getUserName(fieldValue);
                return values.includes(leadOwnerName);
              }
              
              return fieldValue && values.includes(fieldValue.toString());
            } catch {
              return false;
            }
          }
          case 'is_not_any_of': {
            try {
              const values = JSON.parse(filter.value);
              if (!Array.isArray(values)) return true;
              
              if (filter.field === 'record_owner') {
                const leadOwnerName = getUserName(fieldValue);
                return !values.includes(leadOwnerName);
              }
              
              return !fieldValue || !values.includes(fieldValue.toString());
            } catch {
              return true;
            }
          }
          default:
            return true;
        }
      });
      
      if (!passesCustomFilters) return false;
    }
    
    // Record owner filter  
    if (recordOwnerFilter && lead.record_owner !== getUserId(recordOwnerFilter)) {
      return false;
    }

    // Contacted filter
    if (contactedFilter !== 'all') {
      if (contactedFilter === 'contacted' && !lead.contacted) {
        return false;
      }
      if (contactedFilter === 'not_contacted' && lead.contacted) {
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
      (countryFilter === '' || lead.country === countryFilter)
    );
  });

  // Helper function to get user ID from user name
  const getUserId = (userName: string): string => {
    if (!users || users.length === 0) return '';
    const user = users.find(u => `${u.first_name} ${u.last_name}` === userName);
    return user ? user.id : '';
  };

  // Available filter options
  const locations = Array.from(new Set(leads.map(lead => lead.city).filter(city => city !== null && city !== undefined))).sort();
  const businessTypes = Array.from(new Set(leads.map(lead => lead.business_type).filter(type => type !== null && type !== undefined))).sort();
  const countries = Array.from(new Set(leads.map(lead => lead.country).filter(country => country !== null && country !== undefined))).sort();
  
  // Calculate unique record owners (showing names instead of UUIDs)
  const uniqueOwnerIds = Array.from(new Set(leads.map(lead => lead.record_owner).filter(owner => owner !== null && owner !== undefined)));
  const recordOwners = users.length > 0 ? uniqueOwnerIds
    .map(ownerId => getUserName(ownerId))
    .filter(name => name && name !== 'Unknown User' && !name.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))
    .sort() : [];

  // Get unique values for custom filters
  const currencies = Array.from(new Set(leads.map(lead => lead.currency).filter(currency => currency !== null && currency !== undefined && currency !== ''))).sort();
  const locationValues = Array.from(new Set(leads.map(lead => lead.location).filter(location => location !== null && location !== undefined && location !== ''))).sort();

  // Define available filter fields for cold calling (exclude website, email, campaign fields)
  const availableFilterFields = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'poi', label: 'POI' },
    { key: 'address', label: 'Address' },
    { key: 'location', label: 'Location' },
    { key: 'currency', label: 'Currency' },
    { key: 'notes', label: 'Notes' },
    { key: 'first_contacted_date', label: 'First Contacted Date' },
    { key: 'last_modified', label: 'Last Modified' },
    { key: 'created_at', label: 'Created At' }
  ];

  // Create field options for custom filters
  const customFilterFieldOptions: Record<string, string[]> = {
    currency: currencies,
    location: locationValues,
    record_owner: recordOwners
  };

  // Handle adding a custom filter
  const handleAddCustomFilter = (field: string, operator: string, value: string | string[]) => {
    const filterValue = Array.isArray(value) ? JSON.stringify(value) : value;
    setCustomFilters([...customFilters, { field, operator, value: filterValue }]);
  };

  // Handle removing a custom filter
  const handleRemoveCustomFilter = (index: number) => {
    const updatedFilters = [...customFilters];
    updatedFilters.splice(index, 1);
    setCustomFilters(updatedFilters);
  };

  // Handle lead selection
  const handleLeadSelect = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
      if (selectedLeads.length === 1) setSelectAll(false);
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
      if (selectedLeads.length + 1 === filteredLeads.length) setSelectAll(true);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads([]);
      setSelectAll(false);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
      setSelectAll(true);
    }
  };

  // Handle updating contacted status
  const handleContactedChange = async (leadId: string, contacted: boolean) => {
    try {
      console.log('Updating contacted status for lead:', leadId, 'to:', contacted);
      
      const updateData: any = { 
        contacted,
        last_modified: new Date().toISOString()
      };

      // If marking as contacted and no first_contacted_date exists, set it
      if (contacted) {
        const lead = leads.find(l => l.id === leadId);
        if (lead && !lead.first_contacted_date) {
          updateData.first_contacted_date = new Date().toISOString();
          console.log('Setting first contacted date:', updateData.first_contacted_date);
        }
      }

      // Try to update in cold_calling_leads table first
      let updateSuccess = false;
      let lastError = null;
      
      try {
        console.log('Trying cold_calling_leads table...');
        const { error: updateError } = await supabase
          .from('cold_calling_leads')
          .update(updateData)
          .eq('id', leadId);

        if (updateError) {
          console.log('Cold calling table error:', updateError);
          lastError = updateError;
        } else {
          console.log('Successfully updated cold_calling_leads table');
          updateSuccess = true;
        }
      } catch (error) {
        console.log('Cold calling table update failed, trying fallback:', error);
        lastError = error;
      }

      // Fallback to leads table if needed
      if (!updateSuccess) {
        console.log('Trying fallback to leads table...');
        try {
          const { error: fallbackError } = await supabase
            .from('leads')
            .update(updateData)
            .eq('id', leadId);

          if (fallbackError) {
            console.log('Fallback error:', fallbackError);
            throw fallbackError;
          } else {
            console.log('Successfully updated leads table');
            updateSuccess = true;
          }
        } catch (fallbackError) {
          console.log('Both update methods failed. Last errors:', { coldCallingError: lastError, fallbackError });
          throw fallbackError;
        }
      }

      if (updateSuccess) {
        // Update local state
        setLeads(prevLeads => prevLeads.map(lead => 
          lead.id === leadId 
            ? { 
                ...lead, 
                contacted, 
                first_contacted_date: contacted && !lead.first_contacted_date 
                  ? new Date().toISOString() 
                  : lead.first_contacted_date,
                last_modified: new Date().toISOString()
              }
            : lead
        ));

        setToastMessage(contacted ? '📞 Lead marked as contacted' : '📞 Lead marked as not contacted');
        setTimeout(() => setToastMessage(''), 3000);
        console.log('Contacted status updated successfully');
      }

    } catch (error) {
      console.error('Error updating contacted status:', error);
      setToastMessage('❌ Failed to update contacted status - check console for details');
      setTimeout(() => setToastMessage(''), 5000);
    }
  };

  // Handle updating notes with debouncing
  const handleNotesInputChange = (leadId: string, notes: string) => {
    // Update local editing state immediately for responsive UI
    setEditingNotes(prev => ({ ...prev, [leadId]: notes }));
    
    // Clear existing timeout for this lead
    if (notesTimeouts[leadId]) {
      clearTimeout(notesTimeouts[leadId]);
    }
    
    // Set new timeout to save after 1 second of no typing
    const timeout = setTimeout(() => {
      handleNotesChange(leadId, notes);
    }, 1000);
    
    setNotesTimeouts(prev => ({ ...prev, [leadId]: timeout }));
  };

  // Handle updating notes in database
  const handleNotesChange = async (leadId: string, notes: string) => {
    try {
      console.log('Updating notes for lead:', leadId, 'with notes:', notes);
      
      const updateData = { 
        notes,
        last_modified: new Date().toISOString()
      };

      // Try to update in cold_calling_leads table first
      let updateSuccess = false;
      let lastError = null;
      
      try {
        console.log('Trying cold_calling_leads table...');
        const { error: updateError } = await supabase
          .from('cold_calling_leads')
          .update(updateData)
          .eq('id', leadId);

        if (updateError) {
          console.log('Cold calling table error:', updateError);
          lastError = updateError;
        } else {
          console.log('Successfully updated cold_calling_leads table');
          updateSuccess = true;
        }
      } catch (error) {
        console.log('Cold calling table update failed, trying fallback:', error);
        lastError = error;
      }

      // Fallback to leads table if needed
      if (!updateSuccess) {
        console.log('Trying fallback to leads table...');
        try {
          const { error: fallbackError } = await supabase
            .from('leads')
            .update(updateData)
            .eq('id', leadId);

          if (fallbackError) {
            console.log('Fallback error:', fallbackError);
            throw fallbackError;
          } else {
            console.log('Successfully updated leads table');
            updateSuccess = true;
          }
        } catch (fallbackError) {
          console.log('Both update methods failed. Last errors:', { coldCallingError: lastError, fallbackError });
          throw fallbackError;
        }
      }

      if (updateSuccess) {
        // Update local state
        setLeads(prevLeads => prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, notes, last_modified: new Date().toISOString() }
            : lead
        ));

        // Clear the editing state for this lead
        setEditingNotes(prev => {
          const newState = { ...prev };
          delete newState[leadId];
          return newState;
        });

        console.log('Notes updated successfully');
      }

    } catch (error) {
      console.error('Error updating notes:', error);
      setToastMessage('❌ Failed to update notes - check console for details');
      setTimeout(() => setToastMessage(''), 5000);
    }
  };

  // Render editable field
  const renderEditableField = (lead: ColdCallingLead, field: string, value: any) => {
    // Special handling for contacted checkbox
    if (field === 'contacted') {
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleContactedChange(lead.id, e.target.checked)}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          {value && (
            <span className="ml-2 text-xs text-green-600">✓</span>
          )}
        </div>
      );
    }

    // Special handling for first contacted date
    if (field === 'first_contacted_date') {
      if (!value) {
        return <span className="text-gray-400 italic text-sm">Not contacted</span>;
      }
      const date = new Date(value);
      return (
        <span className="text-sm text-gray-900">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      );
    }

    // Special handling for notes
    if (field === 'notes') {
      const currentValue = editingNotes[lead.id] !== undefined ? editingNotes[lead.id] : (value || '');
      return (
        <div className="max-w-xs">
          <textarea
            value={currentValue}
            onChange={(e) => handleNotesInputChange(lead.id, e.target.value)}
            placeholder="Add call notes..."
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none"
            rows={2}
          />
        </div>
      );
    }

    if (!value) {
      return <span className="text-gray-400 italic text-sm">-</span>;
    }

    // Special handling for phone numbers
    if (field === 'phone') {
      return (
        <div className="flex items-center space-x-2">
          <span>{value}</span>
          <a 
            href={`tel:${value}`}
            className="text-green-600 hover:text-green-800"
            title="Call this number"
          >
            📞
          </a>
        </div>
      );
    }

    // Special handling for record owner
    if (field === 'record_owner') {
      return (
        <RecordOwnerDisplay 
          ownerId={value} 
          isEditing={false} 
          onSave={() => {}} 
        />
      );
    }

    return <span>{value}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cold Calling Leads</h1>
          <p className="text-gray-600">Leads without websites but with phone numbers - perfect for cold calling</p>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/leads"
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Back to Business Leads
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cold Calling Leads</p>
              <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
            </div>
            <div className="text-blue-500">📞</div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Contacted</p>
              <p className="text-2xl font-bold text-gray-900">{leads.filter(lead => lead.contacted).length}</p>
            </div>
            <div className="text-green-500">✅</div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Countries</p>
              <p className="text-2xl font-bold text-gray-900">{countries.length}</p>
            </div>
            <div className="text-purple-500">🌍</div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Not Contacted</p>
              <p className="text-2xl font-bold text-gray-900">{leads.filter(lead => !lead.contacted).length}</p>
            </div>
            <div className="text-orange-500">⏳</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search leads by name, phone, location, business type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Country Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
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

            {/* Cities Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cities</label>
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

            {/* Business Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Business Type</label>
              <select 
                className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                value=""
                onChange={(e) => {
                  if (e.target.value && !businessTypeFilter.includes(e.target.value)) {
                    setBusinessTypeFilter([...businessTypeFilter, e.target.value]);
                  }
                }}
              >
                <option value="">Select Business Types...</option>
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

            {/* Record Owner Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Record Owner</label>
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

            {/* Contacted Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Status</label>
              <select 
                className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                value={contactedFilter}
                onChange={(e) => setContactedFilter(e.target.value as 'all' | 'contacted' | 'not_contacted')}
              >
                <option value="all">All Leads</option>
                <option value="contacted">Contacted</option>
                <option value="not_contacted">Not Contacted</option>
              </select>
            </div>
          </div>

          {/* Custom Filters Display */}
          {customFilters.length > 0 && (
            <div className="mt-3">
              <div className="mb-1">
                <span className="text-xs font-medium text-gray-700">Custom Filters:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {customFilters.map((filter, index) => {
                  const fieldLabel = availableFilterFields.find(f => f.key === filter.field)?.label || filter.field;
                  let displayText = '';
                  
                  if (filter.operator === 'contains') {
                    displayText = `${fieldLabel}: ${filter.value}`;
                  } else if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
                    displayText = `${fieldLabel} ${filter.operator.replace(/_/g, ' ')}`;
                  } else if (filter.operator === 'is_any_of' || filter.operator === 'is_not_any_of') {
                    try {
                      const values = JSON.parse(filter.value);
                      const valueText = Array.isArray(values) ? (
                        values.length > 3 
                          ? `${values.slice(0, 3).join(', ')} (+${values.length - 3} more)`
                          : values.join(', ')
                      ) : filter.value;
                      displayText = `${fieldLabel} ${filter.operator.replace(/_/g, ' ')} [${valueText}]`;
                    } catch {
                      displayText = `${fieldLabel} ${filter.operator.replace(/_/g, ' ')} ${filter.value}`;
                    }
                  } else {
                    displayText = `${fieldLabel} ${filter.operator.replace(/_/g, ' ')} ${filter.value}`;
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
              activeFilters={customFilters}
              fieldOptions={customFilterFieldOptions}
            />
            
            <button 
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-200 transition-colors duration-200 font-medium"
              onClick={() => {
                setLocationFilter([]);
                setBusinessTypeFilter([]);
                setCountryFilter('');
                setRecordOwnerFilter('');
                setContactedFilter('all');
                setCustomFilters([]);
                setSearchQuery('');
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          Showing <span className="font-semibold">{filteredLeads.length}</span> of <span className="font-semibold">{leads.length}</span> cold calling leads
          {selectedLeads.length > 0 && (
            <span className="ml-2">• <span className="font-semibold">{selectedLeads.length}</span> selected</span>
          )}
        </p>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record Owner</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => handleLeadSelect(lead.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{lead.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderEditableField(lead, 'phone', lead.phone)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{lead.country}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{lead.city}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{lead.business_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderEditableField(lead, 'contacted', lead.contacted)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderEditableField(lead, 'first_contacted_date', lead.first_contacted_date)}
                  </td>
                  <td className="px-6 py-4">
                    {renderEditableField(lead, 'notes', lead.notes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderEditableField(lead, 'record_owner', lead.record_owner)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* No results message */}
      {filteredLeads.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📞</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No cold calling leads found</h3>
          <p className="text-gray-500">
            {leads.length === 0 
              ? "No leads have been transferred to cold calling yet."
              : "Try adjusting your filters to see more results."
            }
          </p>
        </div>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
          <button 
            onClick={() => setToastMessage('')}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useNotifications } from '../../components/SimpleNotificationProvider';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  photo_url?: string;
}

const UserDisplay = ({ userId }: { userId?: string }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchUser = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        const foundUser = users.find((u: User) => u.id === id);
        setUser(foundUser || null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
          ?
        </div>
        <span className="text-sm">Unknown User</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* User Photo or Initials */}
      <div className="flex-shrink-0">
        {user.photo_url ? (
          <img
            src={user.photo_url}
            alt={`${user.first_name} ${user.last_name}`}
            className="w-6 h-6 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
            {getInitials(user.first_name, user.last_name)}
          </div>
        )}
      </div>
      
      {/* User Name */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">
          {user.first_name} {user.last_name}
        </div>
      </div>
    </div>
  );
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SearchHistoryItem {
  id: string;
  search_method: 'city' | 'coordinates';
  city?: string;
  country?: string;
  coordinates?: string;
  radius?: number;
  categories: string[];
  other_categories?: string;
  selected_group?: string;
  currency?: string;
  created_by?: string;
  total_results: number;
  created_at: string;
  results?: any[];
  status: 'pending' | 'completed' | 'failed' | 'in_process';
  error_message?: string;
}

const getMethodLabel = (method?: string) => {
  if (!method) return '';
  if (method === 'city') return 'City Search';
  if (method === 'coordinates') return 'Coordinates';
  return method.charAt(0).toUpperCase() + method.slice(1);
};

const getHistory = (): SearchHistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('searchHistory');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

function isWithinRange(dateStr: string, from: string, to: string) {
  const d = new Date(dateStr);
  if (from && d < new Date(from)) return false;
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (d > toDate) return false;
  }
  return true;
}

const SearchHistoryPage = () => {
  const { addNotification } = useNotifications();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedItem, setSelectedItem] = useState<SearchHistoryItem | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [retryingSearches, setRetryingSearches] = useState<Set<string>>(new Set());

  // Function to truncate website URLs for better display
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

  // Check for searchId parameter and auto-show results
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchId = urlParams.get('searchId');
    
    if (searchId && searchHistory.length > 0) {
      const targetSearch = searchHistory.find(search => search.id === searchId);
      if (targetSearch && targetSearch.results && targetSearch.results.length > 0) {
        setSelectedItem(targetSearch);
        setShowResults(true);
        // Clear the URL parameter for cleaner address bar
        window.history.replaceState({}, '', '/leads/history');
      }
    }
  }, [searchHistory]);

  // Load search history from Supabase
  const loadSearchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setSearchHistory(data || []);
    } catch (err) {
      console.error('Error loading search history:', err);
      setError('Failed to load search history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSearchHistory();
    
    // Auto-refresh every 30 seconds to catch status updates
    const interval = setInterval(() => {
      loadSearchHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Retry failed search
  const handleRetrySearch = async (item: SearchHistoryItem) => {
    try {
      setRetryingSearches(prev => new Set(prev).add(item.id));
      
      // Update the search status to 'in_process'
      const { error: updateError } = await supabase
        .from('search_history')
        .update({ 
          status: 'in_process',
          error_message: null,
          processing_started_at: new Date().toISOString(),
          processed_count: 0,
          total_results: 0
        })
        .eq('id', item.id);

      if (updateError) {
        throw updateError;
      }

      // Call the existing scrape-google-maps API endpoint
      const response = await fetch('/api/scrape-google-maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchId: item.id // Pass the existing search ID for retry
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to retry search');
      }

      addNotification({
        title: 'Search Retry Started',
        message: `Retrying search for ${item.search_method === 'city' ? `${item.city}, ${item.country}` : 'coordinates'}`,
        type: 'info'
      });

      // Refresh the search history to show updated status
      await loadSearchHistory();

    } catch (error: any) {
      console.error('Error retrying search:', error);
      
      // Reset the status back to failed if retry failed
      await supabase
        .from('search_history')
        .update({ 
          status: 'failed',
          error_message: error.message
        })
        .eq('id', item.id);

      addNotification({
        title: 'Retry Failed',
        message: `Failed to retry search: ${error.message}`,
        type: 'error'
      });
    } finally {
      setRetryingSearches(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Filter search history based on search term and filters
  const filteredHistory = searchHistory.filter(item => {
    const matchesSearch = searchTerm === '' || 
      (item.city && item.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.country && item.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.created_by && item.created_by.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.categories && item.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesMethod = filterMethod === 'all' || item.search_method === filterMethod;
    const matchesCreatedBy = filterCreatedBy === 'all' || item.created_by === filterCreatedBy;
    const matchesDateRange = isWithinRange(item.created_at, dateFrom, dateTo);

    return matchesSearch && matchesMethod && matchesCreatedBy && matchesDateRange;
  });

  // Get unique creators for filter dropdown
  const uniqueCreators = Array.from(new Set(searchHistory.map(item => item.created_by).filter(Boolean)));

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

  const handleViewResults = (item: SearchHistoryItem) => {
    setSelectedItem(item);
    setShowResults(true);
  };

  const handleDeleteSearch = async (id: string) => {
    // Remove this function entirely - we don't want to delete search history
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Search History</h1>
          <div className="flex gap-4">
            <Link href="/leads/extract" className="text-blue-600 hover:underline">
              Back to Extract Leads
            </Link>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Search History</h1>
          <div className="flex gap-4">
            <Link href="/leads/extract" className="text-blue-600 hover:underline">
              Back to Extract Leads
            </Link>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={loadSearchHistory}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (showResults && selectedItem) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Search Results</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowResults(false)}
              className="text-blue-600 hover:underline"
            >
              Back to History
            </button>
            <Link href="/leads/extract" className="text-blue-600 hover:underline">
              Back to Extract Leads
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Search Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Method:</span> {selectedItem.search_method}
              </div>
              <div>
                <span className="font-medium">Location:</span> {
                  selectedItem.search_method === 'city' 
                    ? `${selectedItem.city}, ${selectedItem.country}`
                    : selectedItem.coordinates
                }
              </div>
              <div>
                <span className="font-medium">Created by:</span> {selectedItem.created_by}
              </div>
              <div>
                <span className="font-medium">Date:</span> {formatDate(selectedItem.created_at)}
              </div>
            </div>
            {selectedItem.categories.length > 0 && (
              <div className="mt-4">
                <span className="font-medium">Categories:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedItem.categories.map((category, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedItem.results && selectedItem.results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      Business Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Website
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedItem.results.map((result, index) => (
                    <tr key={result.id || index}>
                      <td className="px-6 py-4 font-medium text-gray-900 max-w-xs">
                        <div className="break-words">{result.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        <div className="break-words">{result.address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.city}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {result.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.phone}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        <div className="break-words">
                          {result.website && (
                            <a 
                              href={result.website.startsWith('http') ? result.website : `https://${result.website}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {truncateWebsite(result.website)}
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No results data available for this search
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Search History</h1>
        <div className="flex gap-4">
          <Link href="/leads/extract" className="text-blue-600 hover:underline">
            Back to Extract Leads
        </Link>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by city, country, creator, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Method
            </label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Methods</option>
              <option value="city">City Search</option>
              <option value="coordinates">Coordinates</option>
            </select>
          </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created By
            </label>
            <select
              value={filterCreatedBy}
              onChange={(e) => setFilterCreatedBy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Creators</option>
              {uniqueCreators.map(creator => (
                <option key={creator} value={creator}>{creator}</option>
            ))}
          </select>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {/* Clear Filters Button */}
        {(searchTerm || filterMethod !== 'all' || filterCreatedBy !== 'all' || dateFrom || dateTo) && (
          <div className="mt-4 flex justify-start">
          <button
              onClick={() => {
                setSearchTerm('');
                setFilterMethod('all');
                setFilterCreatedBy('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear all filters
          </button>
          </div>
        )}
        </div>

      {/* Search History List */}
      <div className="bg-white rounded-lg shadow">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchHistory.length === 0 ? (
              <>
                <p className="text-lg mb-2">No search history found</p>
                <p>Start by extracting leads from Google Maps to see your search history here.</p>
                <Link 
                  href="/leads/extract"
                  className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                >
                  Extract Leads
                </Link>
              </>
            ) : (
              <p>No searches match your current filters.</p>
        )}
      </div>
      ) : (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/10">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/10">
                    Radius
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Categories
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/10">
                    Results
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/10">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/10">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/10">
                    Actions
                  </th>
              </tr>
            </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.search_method === 'city' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.search_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.search_method === 'city' 
                        ? `${item.city}, ${item.country}`
                        : item.coordinates ? item.coordinates.replace(/[^\d\s\.,\-]/g, '').trim() : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.radius ? `${item.radius}m` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs">
                        {item.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.categories.slice(0, 2).map((category, index) => (
                              <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                {category}
                              </span>
                            ))}
                            {item.categories.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{item.categories.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.status === 'completed' ? (
                        <span className="font-medium">{item.total_results}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )} {item.status === 'completed' ? 'results' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <UserDisplay userId={item.created_by} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : item.status === 'in_process'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status === 'in_process' ? 'Processing...' : item.status}
                        </span>
                        {item.status === 'failed' && item.error_message && (
                          <div className="group relative">
                            <span className="text-red-600 cursor-help text-sm">⚠️</span>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap max-w-xs">
                              Error: {item.error_message}
                            </div>
                          </div>
                        )}
                              </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {item.results && item.results.length > 0 && item.status === 'completed' && (
                          <button
                            onClick={() => handleViewResults(item)}
                            className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded border border-blue-600 hover:bg-blue-50"
                          >
                            View Results
                          </button>
                        )}
                        {item.status === 'in_process' && (
                          <span className="text-blue-600 text-sm font-medium px-3 py-1">
                            Processing...
                          </span>
                        )}
                        {item.status === 'failed' && (
                              <button
                            onClick={() => handleRetrySearch(item)}
                            disabled={retryingSearches.has(item.id)}
                            className={`px-3 py-1 rounded border text-sm font-medium ${
                              retryingSearches.has(item.id)
                                ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                : 'border-orange-600 text-orange-600 hover:bg-orange-50 hover:text-orange-700'
                            }`}
                              >
                            {retryingSearches.has(item.id) ? 'Retrying...' : 'Try Again'}
                              </button>
                            )}
                        {item.status === 'completed' && (!item.results || item.results.length === 0) && (
                          <button
                            onClick={() => handleRetrySearch(item)}
                            disabled={retryingSearches.has(item.id)}
                            className={`px-3 py-1 rounded border text-sm font-medium ${
                              retryingSearches.has(item.id)
                                ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                : 'border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700'
                            }`}
                          >
                            {retryingSearches.has(item.id) ? 'Retrying...' : 'Search Again'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
};

export default SearchHistoryPage; 
'use client';

import { useState, useEffect, useRef } from 'react';

type Campaign = {
  id: string;
  name: string;
  status: string;
  contactsCount: number;
  lastUpdated: string;
};

type CampaignDropdownProps = {
  selectedCampaign?: string;
  onCampaignSelect: (campaignId: string, campaignName: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function CampaignDropdown({ 
  selectedCampaign, 
  onCampaignSelect, 
  placeholder = "Select Campaign...",
  className = "",
  disabled = false
}: CampaignDropdownProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load campaigns on component mount
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/campaigns');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate data structure
      if (!Array.isArray(data)) {
        throw new Error('Invalid campaigns data received');
      }
      
      setCampaigns(data);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      setError(error?.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign && 
    campaign.name && 
    campaign.id && 
    (
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const selectedCampaignData = campaigns.find(c => c && c.id === selectedCampaign);

  const handleCampaignSelect = (campaign: Campaign) => {
    onCampaignSelect(campaign.id, campaign.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCampaignSelect('', '');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          ${error ? 'border-red-300' : ''}
        `}
      >
        <span className="block truncate">
          {selectedCampaignData ? selectedCampaignData.name : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
          {selectedCampaignData && !disabled && (
            <div
              onClick={handleClearSelection}
              className="mr-1 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              title="Clear selection"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown panel */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-80 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-hidden focus:outline-none sm:text-sm border border-gray-300">
          {/* Search input */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 z-10">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {/* Scrollable content area */}
          <div className="max-h-60 overflow-y-auto min-h-24">
            {/* Loading state */}
            {loading && (
              <div className="px-3 py-4 text-gray-500 text-center">
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading campaigns...
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="px-3 py-4 text-red-500 text-center">
                <div className="mb-2">Error: {error}</div>
                <button
                  onClick={fetchCampaigns}
                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Campaign options */}
            {!loading && !error && (
              <>
                {filteredCampaigns.length > 0 ? (
                  <>
                    {/* Show message when all campaigns are visible without search */}
                    {!searchTerm && filteredCampaigns.length > 0 && (
                      <div className="px-3 py-2 text-xs text-gray-600 bg-blue-50 border-b border-blue-100">
                        📋 All {filteredCampaigns.length} available campaigns:
                      </div>
                    )}
                    
                    {filteredCampaigns.map((campaign, index) => (
                      <button
                        key={campaign.id}
                        onClick={() => handleCampaignSelect(campaign)}
                        className={`
                          w-full text-left px-4 py-4 hover:bg-blue-50 focus:outline-none focus:bg-blue-50 transition-colors duration-150 
                          ${index !== filteredCampaigns.length - 1 ? 'border-b border-gray-100' : ''}
                          ${selectedCampaign === campaign.id ? 'bg-blue-100 text-blue-900 border-blue-200' : 'text-gray-900'}
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="font-semibold text-sm truncate mb-1">{campaign.name}</div>
                            <div className="text-xs text-gray-500">ID: {campaign.id}</div>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <span className={`
                              px-2 py-1 text-xs rounded-full font-medium
                              ${campaign.status === 'Active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'}
                            `}>
                              {campaign.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {campaign.contactsCount} contacts
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                    
                    {/* Show search results count */}
                    {searchTerm && (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center bg-gray-50 border-t border-gray-200">
                        {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} match your search
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-8 text-gray-500 text-center">
                    <div className="text-4xl mb-2">🔍</div>
                    <div className="text-sm">
                      {searchTerm ? `No campaigns match "${searchTerm}"` : 'No campaigns available'}
                    </div>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
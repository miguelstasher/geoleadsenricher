'use client';

import { useState } from 'react';
import CustomFilter from './CustomFilter';

interface FilterOption {
  id: string;
  label: string;
}

interface CustomFilterType {
  field: string;
  operator: string;
  value: string;
}

interface GlobalFiltersProps {
  countryOptions: FilterOption[];
  cityOptions: FilterOption[];
  businessTypeOptions: FilterOption[];
  emailStatusOptions: FilterOption[];
  campaignOptions: FilterOption[];
  recordOwnerOptions: FilterOption[];
  onFilterChange: (filterType: string, value: string | string[] | CustomFilterType[] | { startDate: string; endDate: string }) => void;
  selectedFilters: {
    country: string;
    cities: string[];
    businessTypes: string[];
    emailStatus: string;
    campaign: string;
    recordOwner: string;
    createdDate: { startDate: string; endDate: string };
    customFilters: CustomFilterType[];
  };
  className?: string;
}

export default function GlobalFilters({
  countryOptions,
  cityOptions,
  businessTypeOptions, 
  emailStatusOptions,
  campaignOptions,
  recordOwnerOptions = [],
  onFilterChange,
  selectedFilters,
  className = ''
}: GlobalFiltersProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'all'>('compact');
  const [dateRange, setDateRange] = useState({
    startDate: selectedFilters.createdDate?.startDate || '',
    endDate: selectedFilters.createdDate?.endDate || ''
  });
  
  // Available fields for custom filters
  const availableCustomFilterFields = [
    { key: 'name', label: 'Name' },
    { key: 'website', label: 'Website' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'recordOwner', label: 'Record Owner' },
    { key: 'email', label: 'Email' },
    { key: 'currency', label: 'Currency' },
    { key: 'lastModified', label: 'Last Modified' },
    { key: 'area', label: 'Area' },
    { key: 'poi', label: 'POI' }
  ];

  // Handle adding a custom filter
  const handleAddCustomFilter = (field: string, operator: string, value: string) => {
    const updatedFilters = [...selectedFilters.customFilters, { field, operator, value }];
    onFilterChange('customFilters', updatedFilters);
  };

  // Handle removing a custom filter
  const handleRemoveCustomFilter = (index: number) => {
    const updatedFilters = [...selectedFilters.customFilters];
    updatedFilters.splice(index, 1);
    onFilterChange('customFilters', updatedFilters);
  };

  // Handle city selection
  const handleCityChange = (city: string) => {
    if (city && !selectedFilters.cities.includes(city)) {
      onFilterChange('cities', [...selectedFilters.cities, city]);
    }
  };

  // Handle removing a city filter
  const handleRemoveCity = (city: string) => {
    const updatedCities = selectedFilters.cities.filter(c => c !== city);
    onFilterChange('cities', updatedCities);
  };

  // Handle business type selection
  const handleBusinessTypeChange = (type: string) => {
    if (type && !selectedFilters.businessTypes.includes(type)) {
      onFilterChange('businessTypes', [...selectedFilters.businessTypes, type]);
    }
  };

  // Handle removing a business type filter
  const handleRemoveBusinessType = (type: string) => {
    const updatedTypes = selectedFilters.businessTypes.filter(t => t !== type);
    onFilterChange('businessTypes', updatedTypes);
  };

  // Handle date range change
  const handleDateRangeChange = (type: 'startDate' | 'endDate', value: string) => {
    const newDateRange = { ...dateRange, [type]: value };
    setDateRange(newDateRange);
    onFilterChange('createdDate', newDateRange);
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFilterChange('country', '');
    onFilterChange('cities', []);
    onFilterChange('businessTypes', []);
    onFilterChange('emailStatus', '');
    onFilterChange('campaign', '');
    onFilterChange('recordOwner', '');
    onFilterChange('createdDate', { startDate: '', endDate: '' });
    onFilterChange('customFilters', []);
  };

  // Add a formatting function for displaying custom filters
  const formatFilterDisplay = (filter: CustomFilterType) => {
    const fieldLabel = availableCustomFilterFields.find(f => f.key === filter.field)?.label || filter.field;
    const operatorKey = filter.operator;
    
    // For empty/not empty operators, we don't need to show the value
    if (operatorKey === 'is_empty' || operatorKey === 'is_not_empty') {
      return `${fieldLabel} ${operatorKey.replace(/_/g, ' ')}`;
    }
    
    // For contains operator, format as "Name: Hotel"
    if (operatorKey === 'contains') {
      return `${fieldLabel}: ${filter.value}`;
    }
    
    // For other operators, show the complete format
    return `${fieldLabel} ${operatorKey.replace(/_/g, ' ')} ${filter.value}`;
  };

  return (
    <div className={`${className}`}>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Filters</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">View mode:</span>
            <div className="flex bg-gray-100 rounded-md">
              <button 
                className={`px-3 py-1 text-sm rounded-md ${viewMode === 'compact' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                onClick={() => setViewMode('compact')}
              >
                Compact
              </button>
              <button 
                className={`px-3 py-1 text-sm rounded-md ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                onClick={() => setViewMode('all')}
              >
                All Fields
              </button>
            </div>
          </div>
        </div>
        
        <div style={{ color: 'red', fontWeight: 'bold' }}>DATE RANGE FILTER LIVE</div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Country Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <select 
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={selectedFilters.country}
              onChange={(e) => onFilterChange('country', e.target.value)}
            >
              <option value="">All Countries</option>
              {countryOptions.map((country) => (
                <option key={country.id} value={country.id}>{country.label}</option>
              ))}
            </select>
          </div>
          
          {/* City/Area Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City/Area
            </label>
            <select 
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value=""
              onChange={(e) => handleCityChange(e.target.value)}
            >
              <option value="">Select Cities...</option>
              {cityOptions.map((city) => (
                <option key={city.id} value={city.id}>{city.label}</option>
              ))}
            </select>
            {selectedFilters.cities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedFilters.cities.map((city) => (
                  <div key={city} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    {cityOptions.find(c => c.id === city)?.label || city}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveCity(city)}
                      className="ml-1.5 text-blue-800 hover:text-blue-600"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Type
            </label>
            <select 
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value=""
              onChange={(e) => handleBusinessTypeChange(e.target.value)}
            >
              <option value="">Select Types...</option>
              {businessTypeOptions.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
            {selectedFilters.businessTypes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedFilters.businessTypes.map((type) => (
                  <div key={type} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    {businessTypeOptions.find(t => t.id === type)?.label || type}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveBusinessType(type)}
                      className="ml-1.5 text-blue-800 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Email Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Status
            </label>
            <select 
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={selectedFilters.emailStatus}
              onChange={(e) => onFilterChange('emailStatus', e.target.value)}
            >
              <option value="">All Statuses</option>
              {emailStatusOptions.map((status) => (
                <option key={status.id} value={status.id}>{status.label}</option>
              ))}
            </select>
          </div>
          
          {/* Campaign Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign
            </label>
            <select 
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={selectedFilters.campaign}
              onChange={(e) => onFilterChange('campaign', e.target.value)}
            >
              <option value="">All Campaigns</option>
              {campaignOptions.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.label}</option>
              ))}
            </select>
          </div>
          
          {/* Record Owner Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Record Owner
            </label>
            <select 
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={selectedFilters.recordOwner}
              onChange={(e) => onFilterChange('recordOwner', e.target.value)}
            >
              <option value="">All Owners</option>
              {recordOwnerOptions.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created Date Range
            </label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  type="date"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  max={dateRange.endDate || undefined}
                />
              </div>
              <div className="flex items-center text-gray-500">to</div>
              <div className="flex-1">
                <input
                  type="date"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  min={dateRange.startDate || undefined}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Custom filters display */}
        {selectedFilters.customFilters.length > 0 && (
          <div className="mt-4">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-700">Custom Filters:</span>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              {selectedFilters.customFilters.map((filter, index) => (
                <div key={index} className="bg-blue-100 text-blue-800 text-sm font-medium px-4 py-2 rounded-md flex items-center shadow-sm">
                  {formatFilterDisplay(filter)}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveCustomFilter(index)}
                    className="ml-3 text-blue-800 hover:text-blue-600 text-lg"
                    aria-label="Remove filter"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 flex justify-between">
          <CustomFilter
            availableFields={availableCustomFilterFields}
            onAddFilter={handleAddCustomFilter}
            onRemoveFilter={handleRemoveCustomFilter}
            activeFilters={[]}
          />
          
          <button 
            className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200"
            onClick={clearAllFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
} 
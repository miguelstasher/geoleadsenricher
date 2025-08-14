'use client';

import { useState } from 'react';
import GlobalFilters from '../components/GlobalFilters';
import Link from 'next/link';

interface CustomFilterType {
  field: string;
  operator: string;
  value: string;
}

export default function FiltersPage() {
  // Sample filter options
  const countryOptions = [
    { id: 'United Kingdom', label: 'United Kingdom' },
    { id: 'United States', label: 'United States' },
    { id: 'France', label: 'France' },
    { id: 'Germany', label: 'Germany' },
    { id: 'Spain', label: 'Spain' }
  ];
  
  const cityOptions = [
    { id: 'London', label: 'London' },
    { id: 'Manchester', label: 'Manchester' },
    { id: 'New York', label: 'New York' },
    { id: 'Paris', label: 'Paris' },
    { id: 'Berlin', label: 'Berlin' },
    { id: 'Madrid', label: 'Madrid' }
  ];
  
  const businessTypeOptions = [
    { id: 'Hotel', label: 'Hotel' },
    { id: 'Restaurant', label: 'Restaurant' },
    { id: 'Apartment', label: 'Apartment' },
    { id: 'Spa', label: 'Spa' },
    { id: 'Co-working space', label: 'Co-working space' },
    { id: 'Hostel', label: 'Hostel' }
  ];
  
  const emailStatusOptions = [
    { id: 'Verified', label: 'Verified' },
    { id: 'Not Verified', label: 'Not Verified' },
    { id: 'Failed', label: 'Failed' }
  ];
  
  const campaignOptions = [
    { id: 'Summer Hotels 2023', label: 'Summer Hotels 2023' },
    { id: 'Luxury Spas', label: 'Luxury Spas' },
    { id: 'Business Spaces 2023', label: 'Business Spaces 2023' },
    { id: 'Budget Accommodations', label: 'Budget Accommodations' }
  ];
  
  const recordOwnerOptions = [
    { id: 'Miguel Elias', label: 'Miguel Elias' },
    { id: 'Paloma Yusty', label: 'Paloma Yusty' },
    { id: 'Periklis Englezos', label: 'Periklis Englezos' },
    { id: 'Kelly Kelsey', label: 'Kelly Kelsey' },
    { id: 'Oscar Thannoyanis', label: 'Oscar Thannoyanis' }
  ];
  
  // Filter state
  const [filters, setFilters] = useState({
    country: '',
    cities: [] as string[],
    businessTypes: [] as string[],
    emailStatus: '',
    campaign: '',
    recordOwner: '',
    createdDate: '',
    customFilters: [] as CustomFilterType[]
  });
  
  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string | string[] | CustomFilterType[]) => {
    setFilters({
      ...filters,
      [filterType]: value
    });
  };
  
  // Format filters for display
  const formatFilters = () => {
    const activeFilters = [];
    
    if (filters.country) {
      activeFilters.push(`Country: ${filters.country}`);
    }
    
    if (filters.cities.length > 0) {
      activeFilters.push(`Cities: ${filters.cities.join(', ')}`);
    }
    
    if (filters.businessTypes.length > 0) {
      activeFilters.push(`Business Types: ${filters.businessTypes.join(', ')}`);
    }
    
    if (filters.emailStatus) {
      activeFilters.push(`Email Status: ${filters.emailStatus}`);
    }
    
    if (filters.campaign) {
      activeFilters.push(`Campaign: ${filters.campaign}`);
    }
    
    if (filters.recordOwner) {
      activeFilters.push(`Record Owner: ${filters.recordOwner}`);
    }
    
    if (filters.createdDate) {
      activeFilters.push(`Created Date: ${filters.createdDate}`);
    }
    
    if (filters.customFilters.length > 0) {
      filters.customFilters.forEach(filter => {
        const operatorDisplay = filter.operator.replace(/_/g, ' ');
        activeFilters.push(`${filter.field} ${operatorDisplay} ${filter.value}`);
      });
    }
    
    return activeFilters;
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Filters Demo</h1>
        <div className="flex space-x-3">
          <Link 
            href="/" 
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
      
      <div className="space-y-8">
        <GlobalFilters 
          countryOptions={countryOptions}
          cityOptions={cityOptions}
          businessTypeOptions={businessTypeOptions}
          emailStatusOptions={emailStatusOptions}
          campaignOptions={campaignOptions}
          recordOwnerOptions={recordOwnerOptions}
          onFilterChange={handleFilterChange}
          selectedFilters={filters}
        />
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Active Filters</h2>
          {formatFilters().length > 0 ? (
            <ul className="list-disc pl-6 space-y-2">
              {formatFilters().map((filter, index) => (
                <li key={index} className="text-gray-700">{filter}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No active filters. Try adding some filters above!</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Filter Features</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Standard Filters</h3>
              <p className="text-gray-700">Use the standard filters to quickly filter your data by the most common fields like Country, City, Business Type, Email Status, and Campaign.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Custom Filters</h3>
              <p className="text-gray-700">Need to filter by other fields? Use the Custom Filter feature to add filters for any field in your data. This gives you flexibility for one-off filtering needs without changing the main interface.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Multi-select Filters</h3>
              <p className="text-gray-700">For City and Business Type, you can select multiple values to create complex filters. Just keep selecting items from the dropdown and they'll be added as tags.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Clear All</h3>
              <p className="text-gray-700">The "Clear Filters" button lets you reset all filters at once, including both standard and custom filters.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Filter Operators</h3>
              <p className="text-gray-700">Each custom filter now supports a variety of operators:</p>
              <ul className="list-disc pl-5 text-gray-700 mt-2">
                <li><strong>contains</strong>: Matches if the field includes the specified text</li>
                <li><strong>does not contain</strong>: Matches if the field does not include the specified text</li>
                <li><strong>is</strong>: Matches if the field exactly equals the specified text</li>
                <li><strong>is not</strong>: Matches if the field does not exactly equal the specified text</li>
                <li><strong>is empty</strong>: Matches if the field is empty or not present</li>
                <li><strong>is not empty</strong>: Matches if the field has a value</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
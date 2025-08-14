'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import CustomFilter from '../../components/CustomFilter';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useNotifications } from '../../components/SimpleNotificationProvider';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sample data for search results
const sampleResults = [
  {
    id: 'lead1',
    name: 'Grand Hotel London',
    type: 'Hotel',
    address: '123 Oxford Street, London, UK',
    phone: '+44 20 1234 5678',
    website: 'www.grandhotellondon.com',
    location: '51.5074, -0.1278'
  },
  {
    id: 'lead2',
    name: 'City Center Apartments',
    type: 'Apartment',
    address: '45 Baker Street, London, UK',
    phone: '+44 20 8765 4321',
    website: 'www.citycenterapts.com',
    location: '51.5204, -0.1568'
  },
  {
    id: 'lead3',
    name: 'The Royal Spa & Resort',
    type: 'Spa',
    address: '78 Regent Street, London, UK',
    phone: '+44 20 3456 7890',
    website: 'www.royalspa.com',
    location: '51.5102, -0.1369'
  },
  {
    id: 'lead4',
    name: 'London Business Hub',
    type: 'Co-working Space',
    address: '250 Fleet Street, London, UK',
    phone: '+44 20 9876 5432',
    website: 'www.londonbusinesshub.co.uk',
    location: '51.5146, -0.1089'
  },
  {
    id: 'lead5',
    name: 'Riverfront Hostel',
    type: 'Hostel',
    address: '15 Thames Road, London, UK',
    phone: '+44 20 2345 6789',
    website: 'www.riverfronthostel.com',
    location: '51.5074, -0.1224'
  }
];

export default function ExtractLeadsPage() {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [searchMethod, setSearchMethod] = useState('city');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [otherCategories, setOtherCategories] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [radius, setRadius] = useState(500);
  const [currency, setCurrency] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formError, setFormError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups] = useState<{ name: string; categories: string[] }[]>([]);
  const [showProcessingMessage, setShowProcessingMessage] = useState(false);
  
  // Add state for business categories
  const [businessCategories, setBusinessCategories] = useState<string[]>([
    "Airbnb Management", "Airport", "Amusement Park", "Antique Shop", "Aparthotel", 
    "Apartment", "Aquarium", "Art Gallery", "B&B", "Bakery", "Bar", "Barber", "Bazar", 
    "Beach Resort", "Bicycle Rental", "Bicycle Shop", "Bike Rental Service", 
    "Boat Rental Service", "Bookstore", "Botanical Garden", "Boutique", "Brewery", 
    "Bus Station", "Cafe"
    // Categories will be loaded from localStorage
  ]);

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

  // Handle search method change
  const handleSearchMethodChange = (method: string) => {
    setSearchMethod(method);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value && !selectedCategories.includes(value)) {
      // Limit to 10 categories
      if (selectedCategories.length < 10) {
        setSelectedCategories([...selectedCategories, value]);
      }
    }
  };

  const removeCategory = (category: string) => {
    setSelectedCategories(selectedCategories.filter(c => c !== category));
  };

  // Store search in history
  const saveSearchToHistory = async (results: any[] = []) => {
    try {
      // Save to Supabase with 'pending' status initially
      const searchData = {
        search_method: searchMethod,
        city: city,
        country: searchMethod === 'city' ? country : null,
        coordinates: searchMethod === 'coordinates' ? coordinates : null,
        radius: searchMethod === 'coordinates' ? radius : null,
        categories: selectedCategories,
        other_categories: otherCategories || null,
        selected_group: selectedGroup || null,
        currency: currency,
        created_by: currentUser?.id || null, // Use currentUser.id for database
        total_results: 0, // Will be updated during processing
        results: null, // Will be populated when completed
        status: 'pending' as const
      };

      const { data, error } = await supabase
        .from('search_history')
        .insert([searchData])
        .select();

      if (error) {
        console.error('Error saving to Supabase:', error);
        // Fall back to localStorage if Supabase fails
        saveToLocalStorage();
        return null;
      } else {
        console.log('Search saved to Supabase:', data);
        return data[0]; // Return the created search record
      }
    } catch (err) {
      console.error('Error saving search history:', err);
      // Fall back to localStorage if Supabase fails
      saveToLocalStorage();
      return null;
    }
  };

  // Fallback function to save to localStorage
  const saveToLocalStorage = () => {
    try {
      const searchData = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        method: searchMethod,
        query: searchMethod === 'city' ? `${city}, ${country}` : coordinates,
        categories: selectedCategories,
        otherCategories,
        createdBy: currentUser?.name || null, // Use currentUser.name for localStorage
      };

      const existing = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const updated = [searchData, ...existing.slice(0, 19)]; // Keep only last 20
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      console.log('Search saved to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  // Function to trigger the actual scraping
  const triggerScraping = async (searchId: string) => {
    try {
      const response = await fetch('/api/scrape-google-maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start scraping');
      }

      const result = await response.json();
      console.log('Scraping started:', result);
    } catch (error) {
      console.error('Error triggering scraping:', error);
      // Update the search status to failed
      await supabase
        .from('search_history')
        .update({ 
          status: 'failed',
          error_message: 'Failed to start scraping process'
        })
        .eq('id', searchId);
    }
  };

  // Function to handle search submission
  const handleSearch = async () => {
    // Validate form
    if (searchMethod === 'city' && (!city || !country)) {
      setFormError('Please enter both city and country.');
      return;
    }
    
    if (searchMethod === 'coordinates' && (!coordinates || !radius || !city)) {
      setFormError('Please enter coordinates, radius, and city.');
      return;
    }
    
    if (!currency || !currentUser) {
      alert('Please fill in Currency. User information is loading...');
      return;
    }

    // Show processing message
    setShowProcessingMessage(true);

    // Save search to history first
    const savedSearch = await saveSearchToHistory();
    
    if (savedSearch) {
      // Show notification that search started
      addNotification({
        title: 'Search Started!',
        message: `Your ${searchMethod === 'city' ? `${city}, ${country}` : 'coordinates'} search is now processing. You'll be notified when it's complete.`,
        type: 'info'
      });
    
      // Trigger the actual scraping process
      await triggerScraping(savedSearch.id);
    } else {
      // Show error notification if search couldn't be saved
      addNotification({
        title: 'Search Failed',
        message: 'Unable to start the search. Please try again.',
        type: 'error'
      });
    }

    // Note: We no longer show fake results here
    // The user will see the progress in the search history
  };

  // Load business categories from localStorage if available
  useEffect(() => {
    try {
      const savedCategories = localStorage.getItem('businessCategories');
      if (savedCategories) {
        const parsedCategories = JSON.parse(savedCategories);
        if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
          setBusinessCategories(parsedCategories);
        }
      }
    } catch (error) {
      console.error('Error loading business categories:', error);
    }
  }, []);

  // Automatically fetch current user on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const users = await response.json();
          if (users.length > 0) {
            // Use the first user (Miguel) and format for backward compatibility
            const user = users[0];
            setCurrentUser({
              id: user.id,
              name: `${user.first_name} ${user.last_name}`,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email
            });
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    // Load groups from localStorage
    try {
      const savedGroups = localStorage.getItem('businessCategoryGroups');
      if (savedGroups) {
        const parsedGroups = JSON.parse(savedGroups);
        if (Array.isArray(parsedGroups)) {
          setGroups(parsedGroups);
        }
      }
    } catch (error) {
      console.error('Error loading business category groups:', error);
    }
  }, []);

  // When a group is selected, auto-select its categories
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupName = e.target.value;
    setSelectedGroup(groupName);
    const group = groups.find(g => g.name === groupName);
    if (group) {
      setSelectedCategories(group.categories);
    }
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setOtherCategories('');
    setCity('');
    setCountry('');
    setCoordinates('');
    setRadius(500);
    setCurrency('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleImportLeads = () => {
    // Simulate importing leads
    setTimeout(() => {
      alert(`${searchResults.length} leads imported successfully!`);
      // Redirect to leads page
      window.location.href = '/leads';
    }, 1000);
  };

  const currencies = [
    "$ - USD - US Dollar", 
    "€ - EUR - Euro", 
    "£ - GBP - British Pound", 
    "¥ - JPY - Japanese Yen", 
    "A$ - AUD - Australian Dollar",
    "C$ - CAD - Canadian Dollar",
    "Fr - CHF - Swiss Franc",
    "¥ - CNY - Chinese Yuan",
    "₹ - INR - Indian Rupee",
    "R$ - BRL - Brazilian Real",
    "$ - MXN - Mexican Peso"
  ];

  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  useEffect(() => {
    // Load users from localStorage
    try {
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        if (Array.isArray(parsedUsers)) {
          setTeamMembers(parsedUsers.map((user: any) => user.name));
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, []);

  // List of countries for dropdown
  const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", 
    "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", 
    "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", 
    "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", 
    "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", 
    "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", 
    "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", 
    "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", 
    "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", 
    "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", 
    "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", 
    "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", 
    "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", 
    "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", 
    "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", 
    "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", 
    "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", 
    "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", 
    "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", 
    "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", 
    "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Extract Leads from Google Maps</h1>
        <div className="flex gap-4">
          <button
            className="text-blue-600 hover:underline"
            onClick={() => router.push('/leads/history')}
          >
            View search history
          </button>
          <Link
            href="/leads"
            className="text-blue-600 hover:underline"
          >
            Back to Leads
          </Link>
        </div>
      </div>
      {showProcessingMessage ? (
        <div className="flex flex-col items-center justify-center bg-blue-50 border border-blue-200 rounded-lg p-8 mt-12 shadow-md">
          <div className="text-xl font-semibold text-blue-800 mb-4">Your scraping is being processed, it can take some minutes.</div>
          <div className="flex gap-4 mt-4">
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
              onClick={() => router.push('/leads')}
            >
              Go to Leads
            </button>
            <button
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300 transition"
              onClick={() => router.push('/leads/history')}
            >
              Go to Search History
            </button>
          </div>
        </div>
      ) : !showResults ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Search Parameters</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Method
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input 
                    type="radio" 
                    name="searchMethod" 
                    value="city" 
                    checked={searchMethod === 'city'}
                    onChange={() => handleSearchMethodChange('city')}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <span className="ml-2">City Search</span>
                </label>
                <label className="inline-flex items-center">
                  <input 
                    type="radio" 
                    name="searchMethod" 
                    value="coordinates" 
                    checked={searchMethod === 'coordinates'}
                    onChange={() => handleSearchMethodChange('coordinates')}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300" 
                  />
                  <span className="ml-2">Coordinates</span>
                </label>
              </div>
            </div>
            
            {searchMethod === 'city' && (
              <>
                <div className="mb-4">
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter city name"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country<span className="text-red-500">*</span>
                  </label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Select a country</option>
                    {countries.map((countryName) => (
                      <option key={countryName} value={countryName}>
                        {countryName}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            {searchMethod === 'coordinates' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 required">
                    Radius (in meters)
                  </label>
                  <div className="flex items-center">
                    <button 
                      type="button"
                      onClick={() => setRadius(Math.max(5, radius - 100))}
                      className="bg-gray-200 text-gray-700 px-3 py-2 rounded-l hover:bg-gray-300"
                      disabled={radius <= 5}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      className="mt-1 block w-full border border-gray-300 rounded-none shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g 500"
                      required
                      min="5"
                      max="5000"
                      step="100"
                      value={radius}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setRadius(value);
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => setRadius(Math.min(5000, radius + 100))}
                      className="bg-gray-200 text-gray-700 px-3 py-2 rounded-r hover:bg-gray-300"
                      disabled={radius >= 5000}
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Min: 5m, Max: 5000m, Step: 100m</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 required">
                    Coordinates
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="In this format: 56.39283, -9.83748"
                    required
                    value={coordinates}
                    onChange={(e) => setCoordinates(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="city-coord" className="block text-sm font-medium text-gray-700 mb-1">
                    City<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city-coord"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter city name (e.g. London)"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">City name for labeling and organization purposes</p>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Category Group
              </label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md mb-2"
                value={selectedGroup}
                onChange={handleGroupChange}
              >
                <option value="">Select a group (optional)</option>
                {groups.map(group => (
                  <option key={group.name} value={group.name}>{group.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select categories
              </label>
              <select 
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                onChange={handleCategoryChange}
                value=""
              >
                <option value="">Select an option</option>
                {businessCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {selectedCategories.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCategories.map((category) => (
                    <div key={category} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                      {category}
                      <button 
                        type="button" 
                        onClick={() => removeCategory(category)}
                        className="ml-1.5 text-blue-800 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">{selectedCategories.length}/10 categories selected</p>
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedGroup('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other categories
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g Hotel, Co-working, Bike Rental"
                value={otherCategories}
                onChange={(e) => setOtherCategories(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">Please separate them with commas and consider the categories you've selected previously.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 required">
                Currency
              </label>
              <select 
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="">Select a currency</option>
                {currencies.map((currency) => (
                  <option key={currency} value={currency.split(' - ')[0]}>{currency}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created by
              </label>
              <div className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-gray-50 sm:text-sm rounded-md">
                {currentUser ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                      {currentUser.first_name?.[0]}{currentUser.last_name?.[0]}
                    </div>
                    <span>{currentUser.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-500">Loading user...</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded mr-4 hover:bg-gray-300"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Start Search
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Search Results</h2>
            <button
              onClick={() => setShowResults(false)}
              className="text-blue-600 hover:underline"
            >
              Back to Search Form
            </button>
          </div>
          
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Searching for businesses...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </div>
          ) : (
            <>
              <div className="mb-4 bg-blue-50 p-4 rounded border border-blue-200">
                <p className="text-blue-800">Found {searchResults.length} businesses matching your criteria in {searchMethod === 'city' ? `${city}, ${country}` : 'the specified coordinates'}.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                        <input type="checkbox" className="mr-2" defaultChecked /> 
                        Business Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                        Address
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                        Phone
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        Website
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchResults.map((result) => (
                      <tr key={result.id}>
                        <td className="px-6 py-4 max-w-xs">
                          <input type="checkbox" className="mr-2 float-left mt-1" defaultChecked />
                          <div className="break-words">
                          <span className="font-medium text-gray-900">{result.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.type}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                          <div className="break-words">{result.address}</div>
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
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleImportLeads}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  Import Selected Businesses
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {!showProcessingMessage && !showResults && (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">How It Works</h2>
          <p className="text-blue-700 mb-4">
            The extraction process uses Google Maps data to find businesses matching your criteria:
          </p>
          <ol className="list-decimal pl-5 text-blue-700 space-y-2">
            <li>Enter location details or coordinates and set your search parameters</li>
            <li>The system will extract businesses from Google Maps within your defined area</li>
            <li>Results are added to your leads database with basic information (name, address, website, phone)</li>
            <li>Use the Enrich feature to find emails and social media profiles for these businesses</li>
          </ol>
        </div>
      )}
    </div>
  );
} 
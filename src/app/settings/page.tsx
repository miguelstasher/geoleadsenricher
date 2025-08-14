'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import CategoryPacksManager from './CategoryPacksManager';
import BusinessCategoryGroupsManager from './BusinessCategoryGroupsManager';
import ProfileManager from '../components/ProfileManager';

// Add type definition for CategoryGroup
type CategoryGroup = {
  name: string;
  categories: string[];
};

export default function SettingsPage() {
  // State for business categories management
  const [categories, setCategories] = useState<string[]>([
    "Airbnb Management", "Airport", "Amusement Park", "Antique Shop", "Aparthotel", 
    "Apartment", "Aquarium", "Art Gallery", "B&B", "Bakery", "Bar", "Barber", "Bazar", 
    "Beach Resort", "Bicycle Rental", "Bicycle Shop", "Bike Rental Service", 
    "Boat Rental Service", "Bookstore", "Botanical Garden", "Boutique", "Brewery", 
    "Bus Station", "Cafe"
    // Initial list is shortened for the UI - full list would come from database
  ]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{index: number, value: string} | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // State for chain domains management
  const [chainEntries, setChainEntries] = useState<{name: string, domain: string}[]>([
    { name: "Hilton", domain: "hilton.com" },
    { name: "Best Western", domain: "bestwestern.com" },
    { name: "Ritz-Carlton", domain: "ritzcarlton.com" },
    { name: "Marriott", domain: "marriott.com" },
    { name: "Sonder", domain: "sonder.com" },
    { name: "Wyndham", domain: "wyndhamhotels.com" },
    { name: "IHG", domain: "ihg.com" },
    { name: "HI Hostels", domain: "hihostels.com" },
    { name: "YHA", domain: "yha.org.uk" },
    { name: "YHA", domain: "yha.com" },
    { name: "Selina", domain: "selina.com" },
    { name: "Premier Inn", domain: "premierinn.com" },
    { name: "Four Seasons", domain: "fourseasons.com" },
    { name: "Hyatt", domain: "hyatt.com" },
    { name: "Jumeirah", domain: "jumeirah.com" },
    { name: "NH Hotels", domain: "nh-hotels.com" },
    { name: "OYO", domain: "oyorooms.com" },
    { name: "Motel 6", domain: "motel6.com" },
    { name: "Travelodge", domain: "travelodge.com" },
    { name: "Hostelworld", domain: "hostelworld.com" },
    { name: "CitizenM", domain: "citizenm.com" },
    // UK Pub and Restaurant Chains
    { name: "JD Wetherspoon", domain: "jdwetherspoon.com" },
    { name: "BrewDog", domain: "brewdog.com" },
    { name: "Greene King", domain: "greeneking.co.uk" },
    { name: "Stonegate Pub Company", domain: "stonegatepubs.com" },
    { name: "Young's", domain: "youngs.co.uk" },
    { name: "Fuller's", domain: "fullers.co.uk" },
    { name: "Mitchells & Butlers", domain: "mbplc.com" },
    { name: "Shepherd Neame", domain: "shepherdneame.co.uk" },
    { name: "Punch Taverns", domain: "punchtaverns.com" },
    { name: "Ei Group", domain: "enterpriseinns.com" },
    { name: "Samuel Smith", domain: "samuelsmithsbrewery.co.uk" },
    { name: "Hall & Woodhouse", domain: "hall-woodhouse.co.uk" },
    // Global Restaurant Chains
    { name: "McDonald's", domain: "mcdonalds.com" },
    { name: "Subway", domain: "subway.com" },
    { name: "Costa Coffee", domain: "costa.co.uk" },
    { name: "Starbucks", domain: "starbucks.com" },
    { name: "KFC", domain: "kfc.com" },
    { name: "Pizza Hut", domain: "pizzahut.com" },
    { name: "Domino's", domain: "dominos.com" },
    { name: "Burger King", domain: "burgerking.com" },
    { name: "Nando's", domain: "nandos.com" },
    { name: "Pret A Manger", domain: "pret.com" },
    { name: "Wagamama", domain: "wagamama.com" },
    { name: "Pizza Express", domain: "pizzaexpress.com" },
    { name: "Zizzi", domain: "zizzi.co.uk" },
    { name: "ASK Italian", domain: "askitalian.co.uk" },
    { name: "TGI Friday's", domain: "tgifridays.com" },
    // Initial list is populated with some of the chains from the provided formula
  ]);
  const [newChainName, setNewChainName] = useState('');
  const [newChainDomain, setNewChainDomain] = useState('');
  const [editingChain, setEditingChain] = useState<{index: number, entry: {name: string, domain: string}} | null>(null);
  const [chainSavedSuccess, setChainSavedSuccess] = useState(false);
  const [csvUploadSuccess, setCsvUploadSuccess] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  
  // State for users management
  const [users, setUsers] = useState<{id: string, name: string, email: string, role: string}[]>([
    { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
    { id: '2', name: 'Sales User', email: 'sales@example.com', role: 'sales' },
    { id: '3', name: 'Viewer User', email: 'viewer@example.com', role: 'viewer' }
  ]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('viewer');
  const [editingUser, setEditingUser] = useState<{index: number, user: {id: string, name: string, email: string, role: string}} | null>(null);
  const [userSavedSuccess, setUserSavedSuccess] = useState(false);

  // State for profile management
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    avatar: '',
    timezone: 'UTC',
    notifications: {
      emailAlerts: true,
      leadUpdates: true,
      teamChanges: true
    }
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState({
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    avatar: '',
    timezone: 'UTC',
    notifications: {
      emailAlerts: true,
      leadUpdates: true,
      teamChanges: true
    }
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // New state for popup notification
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // Add new state for active section
  const [activeSection, setActiveSection] = useState('profile');

  // 1. Add hasUnsavedChanges state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<null | (() => void)>(null);

  // 1. Add groups state to SettingsPage
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [lastSavedCategoryGroups, setLastSavedCategoryGroups] = useState<CategoryGroup[]>([]);

  // Function to show notification
  const showSaveNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    
    // Automatically hide notification after 3 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  // Load saved chain entries and categories from localStorage on component mount
  useEffect(() => {
    try {
      const savedChainEntries = localStorage.getItem('chainEntries');
      if (savedChainEntries) {
        setChainEntries(JSON.parse(savedChainEntries));
      }
      
      const savedCategories = localStorage.getItem('businessCategories');
      if (savedCategories) {
        const parsed = JSON.parse(savedCategories);
        setCategories(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  // Load saved users from localStorage on component mount
  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      }
    } catch (error) {
      console.error('Error loading saved users:', error);
    }
  }, []);

  // Load profile from localStorage on component mount
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        // Ensure notifications object exists with default values
        if (!parsedProfile.notifications) {
          parsedProfile.notifications = {
            emailAlerts: true,
            leadUpdates: true,
            teamChanges: true
          };
        }
        setProfile(parsedProfile);
        setTempProfile(parsedProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, []);

  // 2. On mount, load groups from localStorage
  useEffect(() => {
    try {
      const savedGroups = localStorage.getItem('businessCategoryGroups');
      if (savedGroups) {
        setCategoryGroups(JSON.parse(savedGroups));
        setLastSavedCategoryGroups(JSON.parse(savedGroups));
      }
    } catch (error) {
      console.error('Error loading category groups:', error);
    }
  }, []);

  // 2. Wrap all relevant change handlers to set hasUnsavedChanges to true
  // Example for categories:
  const handleCategoryChange = (...args: any[]) => {
    setHasUnsavedChanges(true);
    // Call the original handler logic here
  };
  // Repeat for other settings (category groups, etc.)

  // 3. Add beforeunload event for browser navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 4. Intercept sidebar navigation
  const handleSectionChange = (section: string) => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
      setPendingNavigation(() => () => setActiveSection(section));
    } else {
      setActiveSection(section);
    }
  };

  // 3. On Save All Changes, write groups to localStorage
  const handleSaveAll = () => {
    try {
      localStorage.setItem('businessCategories', JSON.stringify(categories));
      localStorage.setItem('businessCategoryGroups', JSON.stringify(categoryGroups));
      setLastSavedCategoryGroups(categoryGroups);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
    showSaveNotification('All changes saved successfully!');
  };

  // 4. On discard, revert groups to last saved value
  const handleDiscard = () => {
    setCategoryGroups(lastSavedCategoryGroups);
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  // 7. Cancel modal handler
  const handleCancelModal = () => {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
  };

  // Handle adding a new category
  const addCategory = () => {
    const newCategoryTrimmed = newCategory.trim();
    const isDuplicate = categories.some(
      category => category.toLowerCase() === newCategoryTrimmed.toLowerCase()
    );
    if (newCategoryTrimmed && !isDuplicate) {
      const updatedCategories = [...categories, newCategoryTrimmed].sort((a, b) => 
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
      setCategories(updatedCategories);
      setNewCategory('');
      setHasUnsavedChanges(true);
    } else if (isDuplicate) {
      alert(`The category "${newCategoryTrimmed}" already exists.`);
    }
  };

  // Handle editing a category
  const startEditing = (index: number) => {
    setEditingCategory({index, value: categories[index]});
  };

  const saveEdit = () => {
    if (editingCategory && editingCategory.value.trim()) {
      const updatedCategories = categories.filter((_, i) => i !== editingCategory.index);
      updatedCategories.push(editingCategory.value.trim());
      updatedCategories.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      setCategories(updatedCategories);
      setEditingCategory(null);
      setHasUnsavedChanges(true);
    }
  };

  // Handle removing a category
  const removeCategory = (index: number) => {
    const updatedCategories = categories.filter((_, i) => i !== index);
    setCategories(updatedCategories);
    setHasUnsavedChanges(true);
  };

  // Handle adding a new chain entry
  const addChainEntry = () => {
    if (newChainName.trim() && newChainDomain.trim()) {
      const newEntry = { 
        name: newChainName.trim(), 
        domain: newChainDomain.trim()
      };
      
      // Check for duplicate domains
      const isDuplicate = chainEntries.some(entry => 
        entry.domain.toLowerCase() === newEntry.domain.toLowerCase()
      );
      
      if (isDuplicate) {
        alert('This domain already exists in the chain entries.');
        return;
      }
      
      setChainEntries([...chainEntries, newEntry]);
      setNewChainName('');
      setNewChainDomain('');
      setHasUnsavedChanges(true); // Mark as having unsaved changes
    }
  };

  // Handle editing a chain entry
  const startEditingChain = (index: number) => {
    const entryToEdit = chainEntries[index];
    setEditingChain({
      index, 
      entry: { ...entryToEdit } 
    });
  };

  const saveChainEdit = () => {
    if (editingChain && editingChain.entry.name.trim() && editingChain.entry.domain.trim()) {
      // Check for duplicate domains (excluding the current entry being edited)
      const isDuplicate = chainEntries.some((entry, index) => 
        index !== editingChain.index && 
        entry.domain.toLowerCase() === editingChain.entry.domain.toLowerCase()
      );
      
      if (isDuplicate) {
        alert('This domain already exists in the chain entries.');
        return;
      }
      
      const updatedEntries = [...chainEntries];
      updatedEntries[editingChain.index] = {
        name: editingChain.entry.name.trim(),
        domain: editingChain.entry.domain.trim()
      };
      
      setChainEntries(updatedEntries);
      setEditingChain(null);
      setHasUnsavedChanges(true); // Mark as having unsaved changes
    }
  };

  // Handle removing a chain entry
  const removeChainEntry = (index: number) => {
    const updatedEntries = chainEntries.filter((_, i) => i !== index);
    setChainEntries(updatedEntries);
    setHasUnsavedChanges(true); // Mark as having unsaved changes
  };

  // Handle CSV upload for chains
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const lines = content.split('\n');
      const newChains: {name: string, domain: string}[] = [];
      
      lines.forEach((line, index) => {
        // Skip header row if present
        if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('domain'))) {
          return;
        }
        
        // Process CSV row (supporting both comma and semicolon delimiters)
        const delimiter = line.includes(';') ? ';' : ',';
        const parts = line.split(delimiter);
        
        if (parts.length >= 2) {
          const name = parts[0].trim().replace(/["']/g, '');
          const domain = parts[1].trim().replace(/["']/g, '');
          
          // Only add if domain exists (name is optional for orientation)
          if (domain) {
            newChains.push({ name, domain });
          }
        }
      });
      
      if (newChains.length > 0) {
        // Add new chains to existing list, avoiding duplicates by domain
        const existingDomains = new Set(chainEntries.map(chain => chain.domain.toLowerCase()));
        const uniqueNewChains = newChains.filter(chain => !existingDomains.has(chain.domain.toLowerCase()));
        
        const updatedChainEntries = [...chainEntries, ...uniqueNewChains];
        setChainEntries(updatedChainEntries);
        
        // Save to localStorage
        try {
          localStorage.setItem('chainEntries', JSON.stringify(updatedChainEntries));
          showSaveNotification(`${uniqueNewChains.length} chain entries imported successfully!`);
        } catch (error) {
          console.error('Error saving chain entries:', error);
        }
        
        setCsvUploadSuccess(true);
        setTimeout(() => setCsvUploadSuccess(false), 3000);
      }
      
      // Reset file input
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  // Handle profile update
  const handleProfileUpdate = () => {
    setProfile(tempProfile);
    setIsEditingProfile(false);
    
    // Save to localStorage
    try {
      localStorage.setItem('userProfile', JSON.stringify(tempProfile));
      showSaveNotification('Profile updated successfully!');
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // Handle adding a new user
  const addUser = () => {
    if (newUserName.trim() && newUserEmail.trim()) {
      const newUser = {
        id: Date.now().toString(),
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole
      };
      
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      
      // Save to localStorage
      try {
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        showSaveNotification('User added successfully!');
      } catch (error) {
        console.error('Error saving users:', error);
      }
      
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('viewer');
      
      setUserSavedSuccess(true);
      setTimeout(() => setUserSavedSuccess(false), 3000);
    }
  };

  // Handle editing a user
  const startEditingUser = (index: number) => {
    setEditingUser({
      index,
      user: { ...users[index] }
    });
  };

  const saveUserEdit = () => {
    if (editingUser && editingUser.user.name.trim() && editingUser.user.email.trim()) {
      const updatedUsers = [...users];
      updatedUsers[editingUser.index] = editingUser.user;
      setUsers(updatedUsers);
      
      // Save to localStorage
      try {
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        showSaveNotification('User updated successfully!');
      } catch (error) {
        console.error('Error saving users:', error);
      }
      
      setEditingUser(null);
      
      setUserSavedSuccess(true);
      setTimeout(() => setUserSavedSuccess(false), 3000);
    }
  };

  // Handle removing a user
  const removeUser = (index: number) => {
    const updatedUsers = users.filter((_, i) => i !== index);
    setUsers(updatedUsers);
    
    // Save to localStorage
    try {
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      showSaveNotification('User removed successfully!');
    } catch (error) {
      console.error('Error saving users:', error);
    }
    
    setUserSavedSuccess(true);
    setTimeout(() => setUserSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-white rounded-lg shadow-md p-4 h-fit">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <nav className="space-y-1">
              <button
                onClick={() => handleSectionChange('profile')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === 'profile'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => handleSectionChange('categories')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === 'categories'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Business Categories
              </button>
              <button
                onClick={() => handleSectionChange('chains')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === 'chains'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Chain Management
              </button>
              <button
                onClick={() => handleSectionChange('users')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === 'users'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Users Management
              </button>
              <button
                onClick={() => handleSectionChange('api')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === 'api'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                API Settings
              </button>
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <ProfileManager />
            )}

            {/* Business Categories Section */}
            {activeSection === 'categories' && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Business Categories Management</h2>
                <p className="text-gray-600 mb-6">
                  Manage the business categories available for selection in the extract leads form.
                </p>
                
                {/* Success message */}
                {savedSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4" role="alert">
                    <p>Changes saved successfully!</p>
                  </div>
                )}
                
                {/* Add new category */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Add New Category</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategory ?? ''}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="flex-grow border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter a new business category"
                    />
                    <button
                      onClick={addCategory}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Add Category
                    </button>
                  </div>
                </div>
                
                {/* Add multiple categories from a list */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Add Multiple Categories</h3>
                  <div className="mb-2">
                    <textarea
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      rows={4}
                      placeholder="Paste categories separated by commas (e.g. Hotel, Restaurant, Cafe)"
                      id="categoryList"
                    ></textarea>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">Duplicate categories will be automatically ignored</p>
                    <button
                      onClick={() => {
                        const textarea = document.getElementById('categoryList') as HTMLTextAreaElement;
                        if (textarea && textarea.value) {
                          // Split by commas and trim whitespace
                          const newCategories = textarea.value.split(',').map(cat => cat.trim()).filter(cat => cat);
                          
                          // Remove duplicates within the new list
                          const uniqueNewCategories = [...new Set(newCategories)];
                          
                          // Check against existing categories (case-insensitive)
                          const existingLowerCase = categories.map(cat => cat.toLowerCase());
                          const categoriesToAdd = uniqueNewCategories.filter(
                            cat => !existingLowerCase.includes(cat.toLowerCase())
                          );
                          
                          if (categoriesToAdd.length > 0) {
                            // Add new categories and sort alphabetically
                            const updatedCategories = [...categories, ...categoriesToAdd].sort((a, b) => 
                              a.localeCompare(b, undefined, { sensitivity: 'base' })
                            );
                            setCategories(updatedCategories);
                            
                            // Show success message
                            setSavedSuccess(true);
                            setTimeout(() => setSavedSuccess(false), 3000);
                            
                            // Clear the textarea
                            textarea.value = '';
                            
                            // Show a notification with the results
                            showSaveNotification(`Added ${categoriesToAdd.length} new categories. ${uniqueNewCategories.length - categoriesToAdd.length} were duplicates and ignored.`);
                          } else if (uniqueNewCategories.length > 0) {
                            // All were duplicates
                            showSaveNotification('All categories already exist. No new categories were added.');
                            textarea.value = '';
                          }
                        }
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Add Categories
                    </button>
                  </div>
                </div>
                
                {/* List of existing categories */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Existing Categories</h3>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                    {categories.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {categories.map((category, index) => (
                          <li key={index} className="py-3 flex items-center justify-between">
                            {editingCategory && editingCategory.index === index ? (
                              <div className="flex-grow flex gap-2">
                                <input
                                  type="text"
                                  value={editingCategory ? (editingCategory.value ?? '') : ''}
                                  onChange={(e) => setEditingCategory({...editingCategory, value: e.target.value})}
                                  className="flex-grow border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                <button
                                  onClick={saveEdit}
                                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingCategory(null)}
                                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-gray-700">{category}</span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEditing(index)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => removeCategory(index)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No categories found</p>
                    )}
                  </div>
                </div>
                
                {/* Business Category Groups Section */}
                <div className="mt-10">
                  <h3 className="text-lg font-medium mb-2">Business Category Groups</h3>
                  <p className="text-gray-600 mb-4">Create up to 5 groups, each with up to 10 business categories. Use groups to quickly select sets of categories in forms.</p>
                  <BusinessCategoryGroupsManager
                    categories={categories}
                    groups={categoryGroups}
                    setGroups={setCategoryGroups}
                    onChange={() => setHasUnsavedChanges(true)}
                  />
                </div>
                
                <div className="mt-6 bg-yellow-50 p-4 rounded border border-yellow-200">
                  <h3 className="text-md font-medium text-yellow-800 mb-2">Important Notes</h3>
                  <ul className="list-disc pl-5 text-yellow-700 space-y-1 text-sm">
                    <li>Categories added here will be available in the extract leads form</li>
                    <li>Removing a category will not affect existing leads with that category</li>
                    <li>Categories are sorted alphabetically in the extract leads form</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Chain Management Section */}
            {activeSection === 'chains' && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Chain Management</h2>
                <p className="text-gray-600 mb-6">
                  Manage hotel and business chains that should be marked as chains in the leads database. Leads matching these chains will be marked with a "Chain" tag and can be filtered.
                </p>
                
                {/* Success messages */}
                {chainSavedSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4" role="alert">
                    <p>Chain entries saved successfully!</p>
                  </div>
                )}
                
                {csvUploadSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4" role="alert">
                    <p>CSV chains imported successfully!</p>
                  </div>
                )}
                
                {/* CSV Upload Section */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Import Chains from CSV</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Upload a CSV file with two columns: "Chain Name" and "Domain". Each row will be added as a chain entry.
                    Only the domain column is required for matching.
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      ref={csvFileInputRef}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-600 file:text-white
                        hover:file:bg-blue-700
                        cursor-pointer"
                    />
                    <button
                      onClick={() => csvFileInputRef.current?.click()}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Upload CSV
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Example format: "Marriott,marriott.com" or "Marriott;marriott.com"
                  </div>
                </div>
                
                {/* Add new chain entry */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Add New Chain</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chain Name (for reference)</label>
                      <input
                        type="text"
                        value={newChainName ?? ''}
                        onChange={(e) => setNewChainName(e.target.value)}
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g. Marriott"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Domain (for matching)</label>
                      <input
                        type="text"
                        value={newChainDomain ?? ''}
                        onChange={(e) => setNewChainDomain(e.target.value)}
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g. marriott.com"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addChainEntry}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Add Chain
                  </button>
                </div>
                
                {/* List of existing chain entries */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Existing Chain Entries</h3>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                    {chainEntries.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chain Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {chainEntries.map((entry, index) => (
                            <tr key={index}>
                              {editingChain && editingChain.index === index ? (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                      type="text"
                                      value={editingChain ? (editingChain.entry.name ?? '') : ''}
                                      onChange={(e) => setEditingChain({
                                        ...editingChain,
                                        entry: {...editingChain.entry, name: e.target.value}
                                      })}
                                      className="w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                      type="text"
                                      value={editingChain ? (editingChain.entry.domain ?? '') : ''}
                                      onChange={(e) => setEditingChain({
                                        ...editingChain,
                                        entry: {...editingChain.entry, domain: e.target.value}
                                      })}
                                      className="w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={saveChainEdit}
                                      className="text-green-600 hover:text-green-900 mr-3"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingChain(null)}
                                      className="text-gray-600 hover:text-gray-900"
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.domain}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => startEditingChain(index)}
                                      className="text-blue-600 hover:text-blue-900 mr-3"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => removeChainEntry(index)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No chain entries found</p>
                    )}
                  </div>
                </div>
                
                {/* Save changes button */}
                <div className="mt-6 flex justify-end">
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    onClick={() => {
                      // Save chain entries to local storage to persist them
                      try {
                        localStorage.setItem('chainEntries', JSON.stringify(chainEntries));
                        
                        // Clear unsaved changes state first
                        setHasUnsavedChanges(false);
                        setShowUnsavedModal(false);
                        
                        // Show success notification
                        showSaveNotification('All chain entries saved successfully!');
                        
                        // Simulate saving to database with success message
                        setChainSavedSuccess(true);
                        setTimeout(() => setChainSavedSuccess(false), 3000);
                      } catch (error) {
                        console.error('Error saving chain entries:', error);
                        alert('Failed to save chain entries. Please try again.');
                      }
                    }}
                  >
                    Save All Chain Entries
                  </button>
                </div>
                
                <div className="mt-6 bg-yellow-50 p-4 rounded border border-yellow-200">
                  <h3 className="text-md font-medium text-yellow-800 mb-2">How Chain Detection Works</h3>
                  <ul className="list-disc pl-5 text-yellow-700 space-y-1 text-sm">
                    <li>Leads are automatically marked as chains based on their website domain</li>
                    <li>Chain names are used for reference only and help identify the chain</li>
                    <li>All leads matching chain domains will have a "Chain" field set to "Yes"</li>
                    <li>Leads can be filtered by chain status in the leads list page</li>
                    <li>This helps identify and exclude chain hotels and businesses when needed</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Users Section */}
            {activeSection === 'users' && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Users Management</h2>
                
                {/* Add New User Form */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Add New User</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newUserName ?? ''}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="border rounded-md px-3 py-2"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newUserEmail ?? ''}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="border rounded-md px-3 py-2"
                    />
                    <select
                      value={newUserRole ?? ''}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="border rounded-md px-3 py-2"
                    >
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <button
                    onClick={addUser}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Add User
                  </button>
                </div>

                {/* Users List */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user, index) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser?.index === index ? (
                              <input
                                type="text"
                                value={editingUser ? (editingUser.user.name ?? '') : ''}
                                onChange={(e) => setEditingUser({
                                  ...editingUser,
                                  user: { ...editingUser.user, name: e.target.value }
                                })}
                                className="border rounded-md px-2 py-1 w-full"
                              />
                            ) : (
                              user.name
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser?.index === index ? (
                              <input
                                type="email"
                                value={editingUser ? (editingUser.user.email ?? '') : ''}
                                onChange={(e) => setEditingUser({
                                  ...editingUser,
                                  user: { ...editingUser.user, email: e.target.value }
                                })}
                                className="border rounded-md px-2 py-1 w-full"
                              />
                            ) : (
                              user.email
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser?.index === index ? (
                              <select
                                value={editingUser ? (editingUser.user.role ?? '') : ''}
                                onChange={(e) => setEditingUser({
                                  ...editingUser,
                                  user: { ...editingUser.user, role: e.target.value }
                                })}
                                className="border rounded-md px-2 py-1"
                              >
                                <option value="admin">Admin</option>
                                <option value="sales">Sales</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'sales' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser?.index === index ? (
                              <div className="space-x-2">
                                <button
                                  onClick={saveUserEdit}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="space-x-2">
                                <button
                                  onClick={() => startEditingUser(index)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeUser(index)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* API Settings Section */}
            {activeSection === 'api' && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">API Integration Settings</h2>
                <p className="text-gray-600 mb-6">
                  Configure your API keys for various services used in the application.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hunter.io API Key
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your Hunter.io API key"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Snov.io API Key
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your Snov.io API key"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instantly API Key
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your Instantly API key"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Maps API Key
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your Google Maps API key"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Save API Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 9. Add Save All Changes button at the bottom of the page: */}
      <div className="mt-10 flex justify-end">
        <button
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow hover:bg-blue-700 disabled:opacity-50"
          onClick={handleSaveAll}
          disabled={!hasUnsavedChanges}
        >
          Save All Changes
        </button>
      </div>

      {/* 10. Add Unsaved Changes Modal: */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md relative">
            <h3 className="text-xl font-semibold mb-4">Unsaved Changes</h3>
            <p className="mb-6">You have unsaved changes. Do you want to save before leaving?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelModal}
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
              >
                Discard
              </button>
              <button
                onClick={handleSaveAll}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {notificationMessage}
        </div>
      )}
    </div>
  );
} 
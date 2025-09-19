'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  photo_url?: string;
}

interface RecordOwnerDisplayProps {
  ownerId: string;
  isEditing: boolean;
  onSave: (newOwnerId: string) => void;
  className?: string;
}

export default function RecordOwnerDisplay({ 
  ownerId, 
  isEditing, 
  onSave, 
  className = '' 
}: RecordOwnerDisplayProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState(ownerId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      // Try to find by ID first, then by name
      let user = users.find(u => u.id === ownerId);
      if (!user) {
        // If not found by ID, try to find by name
        user = users.find(u => `${u.first_name} ${u.last_name}` === ownerId);
      }
      if (!user && ownerId) {
        // If still not found but we have an ownerId, create a temporary user object
        user = {
          id: ownerId,
          first_name: ownerId.split(' ')[0] || ownerId,
          last_name: ownerId.split(' ')[1] || '',
          email: ownerId.includes('@') ? ownerId : '',
          photo_url: undefined
        };
      }
      setCurrentUser(user || null);
      setSelectedUserId(ownerId);
    }
  }, [ownerId, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSave(selectedUserId);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={`space-y-2 ${className}`}>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select User</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.first_name} {user.last_name}
            </option>
          ))}
        </select>
        <div className="flex space-x-1">
          <button
            onClick={handleSave}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={() => setSelectedUserId(ownerId)}
            className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
          ?
        </div>
        <span className="text-sm">Unknown User</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* User Photo or Initials */}
      <div className="flex-shrink-0">
        {currentUser.photo_url ? (
          <img
            src={currentUser.photo_url}
            alt={`${currentUser.first_name} ${currentUser.last_name}`}
            className="w-6 h-6 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
            {getInitials(currentUser.first_name, currentUser.last_name)}
          </div>
        )}
      </div>
      
      {/* User Name */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">
          {currentUser.first_name} {currentUser.last_name}
        </div>
      </div>
    </div>
  );
} 
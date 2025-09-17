'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createSupabaseClient } from '@/lib/supabase';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  photo_url?: string;
  bio?: string;
}

interface ProfileManagerProps {
  currentUserId?: string;
}

export default function ProfileManager({ currentUserId }: ProfileManagerProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [actualUserId, setActualUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    bio: ''
  });

  useEffect(() => {
    fetchUserAndProfile();
  }, [currentUserId, user]);

  const fetchUserAndProfile = async () => {
    try {
      setLoading(true);
      
      if (user?.profile) {
        // Use the authenticated user's profile data
        setActualUserId(user.id);
        setProfile({
          id: user.id,
          first_name: user.profile.first_name,
          last_name: user.profile.last_name,
          email: user.profile.email,
          photo_url: user.profile.photo_url,
          bio: ''
        });
        setFormData({
          first_name: user.profile.first_name || '',
          last_name: user.profile.last_name || '',
          email: user.profile.email || '',
          bio: ''
        });
      } else {
        // Fallback to demo data if no user
        setFormData({
          first_name: 'Demo',
          last_name: 'User',
          email: 'demo@example.com',
          bio: ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      showMessage('Please log in to save your profile.', false);
      return;
    }

    try {
      setSaving(true);
      const supabase = createSupabaseClient();
      
      // Update user metadata in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          bio: formData.bio
        }
      });

      if (error) {
        throw error;
      }

      showMessage('Profile updated successfully!', true);
      
      // Update local state to reflect changes
      if (profile) {
        const updatedProfile = {
          ...profile,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          bio: formData.bio
        };
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showMessage('Error saving profile', false);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      showMessage('Please log in to upload a photo.', false);
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('File size must be less than 5MB', false);
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showMessage('Please select an image file', false);
      return;
    }

    try {
      setUploading(true);
      
      // For now, create a local URL for the uploaded image
      const imageUrl = URL.createObjectURL(file);
      
      // Update the profile with the new image
      setProfile(prev => prev ? { ...prev, photo_url: imageUrl } : null);
      showMessage('Photo updated successfully!', true);
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      showMessage('Error uploading photo', false);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const showMessage = (msg: string, success: boolean) => {
    setMessage(msg);
    setIsSuccess(success);
    setTimeout(() => setMessage(''), 3000);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Management</h2>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${isSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Photo Section */}
        <div className="md:col-span-1">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h3>
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {profile?.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
                  {formData.first_name && formData.last_name 
                    ? getInitials(formData.first_name, formData.last_name)
                    : 'JD'
                  }
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
            
            <p className="text-xs text-gray-500 mt-2 text-center">
              JPG, PNG, or GIF. Max 5MB.
            </p>
          </div>
        </div>

        {/* Profile Information Section */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio (Optional)
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us a little about yourself..."
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
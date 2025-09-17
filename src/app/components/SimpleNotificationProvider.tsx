'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  searchId?: string; // Add optional search ID for linking to results
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
    
    // Auto-remove after 10 seconds for non-error notifications
    if (notification.type !== 'error') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 10000);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Monitor search completion
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    const checkForCompletedSearches = async (isRetry = false) => {
      try {
        // Check if environment variables are available
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          console.warn('Supabase environment variables not available for notification provider');
          return;
        }

        // Validate URL format
        try {
          new URL(supabaseUrl);
        } catch (urlError) {
          console.error('Invalid Supabase URL format:', supabaseUrl);
          return;
        }

        // Import supabase dynamically to avoid SSR issues
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Get searches that are completed - look at all completed searches and filter by notification status
        const { data, error } = await supabase
          .from('search_history')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20); // Check last 20 searches to catch recent completions

        if (error) {
          console.error('Error checking for completed searches:', error);
          // Only log detailed error info in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Error details:', JSON.stringify(error, null, 2));
          }
          return;
        }

        console.log('Successfully checked for completed searches. Found:', data?.length || 0, 'completed searches');

        // Check if we have any new completed searches (not already notified)
        const notifiedSearches = JSON.parse(localStorage.getItem('notifiedSearches') || '[]');
        
        const newCompletedSearches = (data || []).filter(search => 
          !notifiedSearches.includes(search.id)
        );

        console.log('New completed searches to notify:', newCompletedSearches.length);

        newCompletedSearches.forEach(search => {
          // Check if this was a retry by looking at processing time
          const processingTime = search.processing_started_at ? 
            new Date(search.processing_started_at) : 
            new Date(search.created_at);
          const timeSinceCreation = Date.now() - new Date(search.created_at).getTime();
          const isRetry = timeSinceCreation > 10 * 60 * 1000; // More than 10 minutes old = likely a retry

          const title = isRetry ? 'Search Retry Completed!' : 'Search Completed!';
          const locationText = search.search_method === 'city' ? 
            `${search.city}, ${search.country}` : 
            'coordinates';
          const message = `Found ${search.total_results || 0} leads for your ${locationText} search`;
          
          addNotification({
            title,
            message,
            type: 'success',
            searchId: search.id
          });
          
          console.log(`Added notification for completed search: ${search.id} with ${search.total_results || 0} results`);
        });

        // Update notified searches list
        if (newCompletedSearches.length > 0) {
          const updatedNotified = [...notifiedSearches, ...newCompletedSearches.map(s => s.id)];
          localStorage.setItem('notifiedSearches', JSON.stringify(updatedNotified));
        }

      } catch (error) {
        console.error('Error monitoring search completion:', error);
        
        // Only log detailed error info in development to avoid console spam
        if (process.env.NODE_ENV === 'development' && error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }

        // Implement retry logic for network errors
        if (retryCount < maxRetries && !isRetry) {
          retryCount++;
          const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff
          console.log(`Retrying search completion check in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
          
          setTimeout(() => {
            checkForCompletedSearches(true);
          }, delay);
        } else if (retryCount >= maxRetries) {
          console.warn('Max retries reached for search completion check. Will retry on next interval.');
          retryCount = 0; // Reset for next interval
        }
      }
    };

    // Check immediately and then every 30 seconds
    checkForCompletedSearches();
    const interval = setInterval(checkForCompletedSearches, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      markAsRead,
      clearAll,
      unreadCount
    }}>
      {children}
      <NotificationToast />
    </NotificationContext.Provider>
  );
}

// Toast notification component
function NotificationToast() {
  const { notifications, markAsRead } = useNotifications();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get unread notifications
  const unreadNotifications = notifications.filter(n => !n.read);
  const currentNotification = unreadNotifications[currentIndex];
  const totalUnread = unreadNotifications.length;

  // Reset index when notifications change
  useEffect(() => {
    if (currentIndex >= unreadNotifications.length && unreadNotifications.length > 0) {
      setCurrentIndex(0);
    } else if (unreadNotifications.length === 0) {
      setCurrentIndex(0);
    }
  }, [unreadNotifications.length, currentIndex]);

  const handleDismiss = () => {
    if (currentNotification) {
      markAsRead(currentNotification.id);
      
      // If there are more notifications, show the next one
      // Otherwise, the useEffect will handle resetting the index
      if (currentIndex < unreadNotifications.length - 1) {
        // Stay at current index, as the array will shift
        setCurrentIndex(currentIndex);
      } else {
        // This was the last notification, reset to 0
        setCurrentIndex(0);
      }
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleTimeString();
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Don't show anything if no notifications
  if (!currentNotification || totalUnread === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`max-w-sm w-full border rounded-lg shadow-lg p-4 transition-all duration-300 ${getColorForType(currentNotification.type)}`}
      >
        <div className="flex items-start">
          <div className="mr-3 text-lg flex-shrink-0">
            {getIconForType(currentNotification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-sm">{currentNotification.title}</h4>
              {totalUnread > 1 && (
                <span className="text-xs bg-black bg-opacity-10 px-2 py-1 rounded-full">
                  {currentIndex + 1}/{totalUnread}
                </span>
              )}
            </div>
            <p className="text-sm mt-1">{currentNotification.message}</p>
            <p className="text-xs mt-2 opacity-75">
              {formatTime(currentNotification.timestamp)}
            </p>
            {/* Add View Results button for search completion notifications */}
            {currentNotification.searchId && (
              <div className="mt-3 flex gap-2">
                <a
                  href={`/leads/history?searchId=${currentNotification.searchId}`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                  onClick={() => markAsRead(currentNotification.id)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View Results
                </a>
              </div>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="ml-3 text-lg opacity-60 hover:opacity-100 flex-shrink-0"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
} 
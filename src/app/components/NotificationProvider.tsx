'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
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

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    const checkForCompletedSearches = async () => {
      try {
        // Get searches that completed in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
          .from('search_history')
          .select('*')
          .eq('status', 'completed')
          .gte('created_at', fiveMinutesAgo)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error checking for completed searches:', error);
          return;
        }

        // Check if we have any new completed searches (not already notified)
        const notifiedSearches = JSON.parse(localStorage.getItem('notifiedSearches') || '[]');
        
        const newCompletedSearches = (data || []).filter(search => 
          !notifiedSearches.includes(search.id)
        );

        newCompletedSearches.forEach(search => {
          addNotification({
            title: 'Search Completed!',
            message: `Found ${search.total_results} leads for your ${search.search_method === 'city' ? `${search.city}, ${search.country}` : 'coordinates'} search`,
            type: 'success'
          });
        });

        // Update notified searches list
        if (newCompletedSearches.length > 0) {
          const updatedNotified = [...notifiedSearches, ...newCompletedSearches.map(s => s.id)];
          localStorage.setItem('notifiedSearches', JSON.stringify(updatedNotified));
        }

      } catch (error) {
        console.error('Error monitoring search completion:', error);
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
};

// Toast notification component
const NotificationToast: React.FC = () => {
  const { notifications, markAsRead } = useNotifications();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Show unread notifications
    const unread = notifications.filter(n => !n.read).slice(0, 3); // Limit to 3 visible
    setVisibleNotifications(unread);
  }, [notifications]);

  const handleDismiss = (id: string) => {
    markAsRead(id);
    setVisibleNotifications(prev => prev.filter(n => n.id !== id));
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

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm w-full border rounded-lg shadow-lg p-4 transition-all duration-300 ${getColorForType(notification.type)}`}
        >
          <div className="flex items-start">
            <div className="mr-3 text-lg">
              {getIconForType(notification.type)}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              <p className="text-sm mt-1">{notification.message}</p>
              <p className="text-xs mt-2 opacity-75">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => handleDismiss(notification.id)}
              className="ml-3 text-lg opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}; 
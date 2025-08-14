'use client';

import { useNotifications } from './SimpleNotificationProvider';
import { useState } from 'react';

export default function NavBar() {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <nav className="bg-blue-600 text-white p-4 relative">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">GeoLeads Enricher</h1>
        <div className="flex items-center space-x-4">
          <a href="/" className="hover:underline">Dashboard</a>
          <a href="/leads" className="hover:underline">Leads</a>
          <a href="/campaigns" className="hover:underline">Campaigns</a>
          <a href="/settings" className="hover:underline">Settings</a>
          
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={handleNotificationClick}
              className="relative p-2 rounded-full hover:bg-blue-700 transition-colors"
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-lg">
                            {notification.type === 'success' ? '✅' : 
                             notification.type === 'error' ? '❌' : 
                             notification.type === 'warning' ? '⚠️' : 'ℹ️'}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{notification.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {notification.timestamp.toLocaleString()}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNotifications(false)}
        />
      )}
    </nav>
  );
} 
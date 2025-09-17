'use client';

import { useState } from 'react';

interface EmailVerificationNotificationProps {
  email: string;
  leadId: number;
  onVerify: (email: string, leadId: number) => Promise<void>;
  onDismiss: () => void;
}

export default function EmailVerificationNotification({
  email,
  leadId,
  onVerify,
  onDismiss
}: EmailVerificationNotificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await onVerify(email, leadId);
      onDismiss();
    } catch (error) {
      console.error('Email verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900">
            Email Added Manually
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            An email has been added manually: <span className="font-mono text-xs bg-gray-100 px-1 rounded">{email}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Do you want to verify it with Hunter.io?
          </p>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                'Yes, Verify'
              )}
            </button>
            <button
              onClick={onDismiss}
              disabled={isVerifying}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              No, Skip
            </button>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={onDismiss}
            disabled={isVerifying}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

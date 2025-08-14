'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Link from 'next/link';

interface EnrichmentProgress {
  completed: number;
  total: number;
  currentLead: string;
  status: 'running' | 'completed' | 'error';
  results?: {
    total: number;
    updated: number;
    errors: number;
    successfulEmails: number;
  };
  error?: string;
  startTime: number;
}

interface EnrichmentProgressNotificationProps {
  jobId: string | null;
  onClose: () => void;
}

export default function EnrichmentProgressNotification({
  jobId,
  onClose
}: EnrichmentProgressNotificationProps) {
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (jobId) {
      setIsVisible(true);
      // Initialize with starting progress
      setProgress({
        completed: 0,
        total: 0,
        currentLead: 'Starting enrichment...',
        status: 'running',
        startTime: Date.now()
      });
      startProgressTracking();
    } else {
      setIsVisible(false);
      setProgress(null);
    }
  }, [jobId]);

  const startProgressTracking = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/enrich-leads/batch/status?jobId=${jobId}`);
        if (response.ok) {
          const data = await response.json();
          setProgress(data);
          
          // If job is completed or failed, stop tracking
          if (data.status === 'completed' || data.status === 'error') {
            clearInterval(interval);
            
            // Show completion notification with link
            if (data.status === 'completed') {
              const successCount = data.results?.successfulEmails || 0;
              toast.success(
                <div>
                  <div className="font-semibold">✅ Enrichment Completed!</div>
                  <div className="text-sm mt-1">
                    Found {successCount} emails out of {data.total} leads
                  </div>
                  <Link 
                    href="/leads" 
                    className="text-blue-600 hover:text-blue-800 underline text-sm mt-2 inline-block"
                  >
                    View Updated Leads →
                  </Link>
                </div>,
                {
                  autoClose: 8000,
                  closeOnClick: false,
                  draggable: true,
                }
              );
            } else if (data.status === 'error') {
              toast.error(
                <div>
                  <div className="font-semibold">❌ Enrichment Failed</div>
                  <div className="text-sm mt-1">{data.error}</div>
                </div>,
                {
                  autoClose: 5000,
                  closeOnClick: false,
                  draggable: true,
                }
              );
            }
            
            // Close the progress notification after a delay
            setTimeout(() => {
              setIsVisible(false);
              onClose();
            }, 3000);
          }
        } else {
          // If we can't fetch status, assume it's still running
          setProgress(prev => prev ? {
            ...prev,
            currentLead: 'Processing leads...',
            completed: Math.min(prev.completed + 1, prev.total || 10)
          } : null);
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
        // If we can't fetch status, assume it's still running
        setProgress(prev => prev ? {
          ...prev,
          currentLead: 'Processing leads...',
          completed: Math.min(prev.completed + 1, prev.total || 10)
        } : null);
      }
    }, 2000); // Check every 2 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  };

  if (!isVisible) return null;

  const percentage = progress?.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const elapsedTime = progress?.startTime ? Math.floor((Date.now() - progress.startTime) / 1000 / 60) : 0;

  return (
    <div className="fixed top-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <h3 className="font-semibold text-gray-900">Email Enrichment</h3>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{progress?.completed || 0}/{progress?.total || '?'} leads</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Current Lead */}
        {progress?.status === 'running' && progress.currentLead && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">Currently processing:</div>
            <div className="text-sm font-medium text-gray-900 truncate">
              {progress.currentLead}
            </div>
          </div>
        )}

        {/* Status and Time */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-2">
            {progress?.status === 'running' && (
              <div className="flex items-center space-x-1 text-blue-600">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Running</span>
              </div>
            )}
            {progress?.status === 'completed' && (
              <div className="flex items-center space-x-1 text-green-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Completed</span>
              </div>
            )}
            {progress?.status === 'error' && (
              <div className="flex items-center space-x-1 text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Error</span>
              </div>
            )}
          </div>
          <div className="text-gray-500">
            {elapsedTime > 0 ? `${elapsedTime} min` : '< 1 min'}
          </div>
        </div>

        {/* Results Summary (when completed) */}
        {progress?.status === 'completed' && progress.results && (
          <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
            <div className="text-sm text-green-800">
              <div className="font-medium mb-1">Results Summary:</div>
              <div className="space-y-1">
                <div>✅ {progress.results.successfulEmails} emails found</div>
                <div>📝 {progress.results.updated} leads updated</div>
                {progress.results.errors > 0 && (
                  <div>❌ {progress.results.errors} errors</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message (when failed) */}
        {progress?.status === 'error' && progress.error && (
          <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
            <div className="text-sm text-red-800">
              <div className="font-medium mb-1">Error:</div>
              <div>{progress.error}</div>
            </div>
          </div>
        )}

        {/* Message */}
        <div className="mt-3 text-xs text-gray-500 italic">
          💡 You can continue using other features while enrichment runs!
        </div>
      </div>
    </div>
  );
}

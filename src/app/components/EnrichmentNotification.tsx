"use client";

import { useState, useEffect } from 'react';

interface EnrichmentJob {
  jobId: string;
  status: 'running' | 'completed' | 'cancelled' | 'error';
  progress: {
    completed: number;
    total: number;
    currentLead: string;
    percentage: number;
    timeElapsedMinutes: number;
    estimatedTimeRemainingMinutes: number;
  };
  error?: string;
}

interface EnrichmentNotificationProps {
  jobId: string | null;
  onComplete: () => void;
  onCancel: () => void;
}

export default function EnrichmentNotification({ 
  jobId, 
  onComplete, 
  onCancel 
}: EnrichmentNotificationProps) {
  const [job, setJob] = useState<EnrichmentJob | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setIsVisible(false);
      setJob(null);
      return;
    }

    setIsVisible(true);
    
    // Poll for job status
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/enrich-leads?jobId=${jobId}`);
        const data = await response.json();

        if (response.ok) {
          setJob(data);

          // Handle completion
          if (data.status === 'completed') {
            clearInterval(pollInterval);
            setTimeout(() => {
              setIsVisible(false);
              onComplete();
            }, 3000); // Show completion message for 3 seconds
          }

          // Handle errors
          if (data.status === 'error') {
            clearInterval(pollInterval);
          }

          // Handle cancellation
          if (data.status === 'cancelled') {
            clearInterval(pollInterval);
            setTimeout(() => {
              setIsVisible(false);
              onCancel();
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [jobId, onComplete, onCancel]);

  const handleCancel = async () => {
    if (!jobId || !job || job.status !== 'running') return;

    try {
      const response = await fetch(`/api/enrich-leads?jobId=${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  if (!isVisible || !job) {
    return null;
  }

  const getStatusIcon = () => {
    switch (job.status) {
      case 'running':
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        );
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'running': return 'bg-blue-50 border-blue-200';
      case 'completed': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'cancelled': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusMessage = () => {
    switch (job.status) {
      case 'running':
        return `Enriching emails... ${job.progress.completed}/${job.progress.total} completed`;
      case 'completed':
        return `✅ Email enrichment completed! ${job.progress.completed} leads processed`;
      case 'error':
        return `❌ Enrichment failed: ${job.error}`;
      case 'cancelled':
        return `⏹️ Enrichment cancelled`;
      default:
        return 'Processing...';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg border shadow-lg ${getStatusColor()}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">
            Email Enrichment
          </div>
          
          <div className="text-sm text-gray-600 mt-1">
            {getStatusMessage()}
          </div>

          {job.status === 'running' && (
            <>
              {/* Progress Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{job.progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${job.progress.percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Lead */}
              <div className="text-xs text-gray-500 mt-2">
                Current: {job.progress.currentLead}
              </div>

              {/* Time Estimates */}
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Elapsed: {job.progress.timeElapsedMinutes}m</span>
                <span>
                  {job.progress.estimatedTimeRemainingMinutes > 0 
                    ? `Est. remaining: ${job.progress.estimatedTimeRemainingMinutes}m`
                    : 'Almost done...'
                  }
                </span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0">
          {job.status === 'running' && (
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Cancel enrichment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {(job.status === 'completed' || job.status === 'error' || job.status === 'cancelled') && (
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Close notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Results Summary for Completed Jobs */}
      {job.status === 'completed' && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="text-xs text-green-700">
            🎯 Check your leads table - emails have been updated!
          </div>
        </div>
      )}
    </div>
  );
} 
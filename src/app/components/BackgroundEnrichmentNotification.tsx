'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

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
  results?: any[];
  error?: string;
}

interface BackgroundEnrichmentNotificationProps {
  jobId: string | null;
  onComplete: () => void;
  onCancel: () => void;
}

export default function BackgroundEnrichmentNotification({ 
  jobId, 
  onComplete, 
  onCancel 
}: BackgroundEnrichmentNotificationProps) {
  const [job, setJob] = useState<EnrichmentJob | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setIsVisible(false);
      setJob(null);
      return;
    }

    setIsVisible(true);
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/enrich-leads?jobId=${jobId}`);
        if (response.ok) {
          const jobData = await response.json();
          setJob(jobData);

          // Handle job completion
          if (jobData.status === 'completed') {
            clearInterval(interval);
            setIsVisible(false);
            
            // Show success notification
            const successCount = jobData.results?.filter((r: any) => 
              r.email && r.email !== 'not_found' && r.email !== 'Not Found'
            ).length || 0;
            
            toast.success(
              `🎉 Enrichment completed! Found ${successCount} emails out of ${jobData.progress.total} leads.`,
              { autoClose: 5000 }
            );
            
            onComplete();
          }

          // Handle job error
          if (jobData.status === 'error') {
            clearInterval(interval);
            setIsVisible(false);
            
            toast.error(
              `❌ Enrichment failed: ${jobData.error}`,
              { autoClose: 5000 }
            );
            
            onComplete();
          }

          // Handle job cancellation
          if (jobData.status === 'cancelled') {
            clearInterval(interval);
            setIsVisible(false);
            
            toast.info(
              '⏹️ Enrichment cancelled by user.',
              { autoClose: 3000 }
            );
            
            onComplete();
          }
        }
      } catch (error) {
        console.error('Error checking job status:', error);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  const handleCancel = async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/enrich-leads?jobId=${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.info('⏹️ Cancelling enrichment...');
        onCancel();
      } else {
        toast.error('❌ Failed to cancel enrichment');
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('❌ Failed to cancel enrichment');
    }
  };

  if (!isVisible || !job) return null;

  const progressPercentage = job.progress.percentage || 0;
  const timeElapsed = job.progress.timeElapsedMinutes || 0;
  const timeRemaining = job.progress.estimatedTimeRemainingMinutes || 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          🔄 Background Enrichment
        </h3>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 text-sm"
          title="Cancel enrichment"
        >
          ✕
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{job.progress.completed} / {job.progress.total} leads</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Current Lead */}
      <div className="text-xs text-gray-600 mb-2">
        <span className="font-medium">Currently processing:</span>
        <div className="truncate">{job.progress.currentLead}</div>
      </div>

      {/* Time Estimates */}
      <div className="text-xs text-gray-500 mb-3">
        <div>⏱️ Elapsed: {timeElapsed} min</div>
        {timeRemaining > 0 && (
          <div>⏳ Remaining: ~{timeRemaining} min</div>
        )}
      </div>

      {/* Status */}
      <div className="text-xs">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          job.status === 'running' ? 'bg-blue-100 text-blue-800' :
          job.status === 'completed' ? 'bg-green-100 text-green-800' :
          job.status === 'error' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {job.status === 'running' && '🔄 Running'}
          {job.status === 'completed' && '✅ Completed'}
          {job.status === 'error' && '❌ Error'}
          {job.status === 'cancelled' && '⏹️ Cancelled'}
        </span>
      </div>

      {/* Continue Working Message */}
      <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
        💡 You can continue using other features while enrichment runs in the background!
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface JobProgressProps {
  jobId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

interface JobStatus {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_message: string;
  result: any;
  error: string;
  created_at: string;
  completed_at: string;
}

export default function JobProgress({ jobId, onComplete, onError }: JobProgressProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    const pollJobStatus = async () => {
      try {
        const response = await fetch(`/api/jobs?jobId=${jobId}`);
        if (response.ok) {
          const job = await response.json();
          setJobStatus(job);

          if (job.status === 'completed') {
            setIsPolling(false);
            onComplete?.(job.result);
          } else if (job.status === 'failed') {
            setIsPolling(false);
            onError?.(job.error || 'Job failed');
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    };

    // Poll immediately
    pollJobStatus();

    // Set up polling interval
    const interval = setInterval(() => {
      if (isPolling) {
        pollJobStatus();
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobId, isPolling, onComplete, onError]);

  if (!jobStatus) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Starting job...</span>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Background Job Progress
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(jobStatus.status)}`}>
          {getStatusIcon(jobStatus.status)} {jobStatus.status.charAt(0).toUpperCase() + jobStatus.status.slice(1)}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{jobStatus.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${jobStatus.progress}%` }}
          ></div>
        </div>
      </div>

      {jobStatus.current_message && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">{jobStatus.current_message}</p>
        </div>
      )}

      {jobStatus.status === 'completed' && jobStatus.result && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Job Completed Successfully!</h4>
          <p className="text-sm text-green-700">{jobStatus.result.message}</p>
          {jobStatus.result.totalPlaces && (
            <p className="text-sm text-green-700 mt-1">
              Total places found: {jobStatus.result.totalPlaces}, Processed: {jobStatus.result.processedPlaces}
            </p>
          )}
        </div>
      )}

      {jobStatus.status === 'failed' && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg">
          <h4 className="font-medium text-red-800 mb-2">Job Failed</h4>
          <p className="text-sm text-red-700">{jobStatus.error}</p>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>Job ID: {jobStatus.id}</p>
        <p>Started: {new Date(jobStatus.created_at).toLocaleString()}</p>
        {jobStatus.completed_at && (
          <p>Completed: {new Date(jobStatus.completed_at).toLocaleString()}</p>
        )}
      </div>

      {jobStatus.status === 'processing' && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> You can continue using the platform while this job runs in the background. 
            The results will be available in the Leads section when complete.
          </p>
        </div>
      )}
    </div>
  );
}

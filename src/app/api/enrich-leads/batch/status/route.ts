import { NextRequest, NextResponse } from 'next/server';

// Global state for tracking enrichment jobs (in-memory - will reset on server restart)
const enrichmentJobs = new Map<string, {
  status: 'running' | 'completed' | 'error';
  progress: {
    completed: number;
    total: number;
    currentLead: string;
  };
  results?: {
    total: number;
    updated: number;
    errors: number;
    successfulEmails: number;
  };
  error?: string;
  startTime: number;
}>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const job = enrichmentJobs.get(jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: job.status,
      completed: job.progress.completed,
      total: job.progress.total,
      currentLead: job.progress.currentLead,
      results: job.results,
      error: job.error,
      startTime: job.startTime
    });

  } catch (error: any) {
    console.error('Error fetching job status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Export the jobs map so it can be used by the batch endpoint
export { enrichmentJobs };

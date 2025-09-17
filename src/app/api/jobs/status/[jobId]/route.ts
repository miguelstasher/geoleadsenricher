import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Get job status
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get related search history if available
    let searchHistory = null;
    if (job.params?.searchId) {
      const { data: search } = await supabase
        .from('search_history')
        .select('*')
        .eq('id', job.params.searchId)
        .single();
      
      searchHistory = search;
    }

    // Calculate estimated time remaining
    let estimatedTimeRemaining = null;
    if (job.status === 'processing' && job.progress > 0) {
      const elapsed = new Date().getTime() - new Date(job.created_at).getTime();
      const progressRatio = job.progress / 100;
      const totalEstimated = elapsed / progressRatio;
      estimatedTimeRemaining = Math.max(0, totalEstimated - elapsed);
    }

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress || 0,
      currentMessage: job.current_message,
      estimatedDuration: job.estimated_duration,
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining / 1000), // in seconds
      createdAt: job.created_at,
      completedAt: job.completed_at,
      error: job.error,
      searchHistory: searchHistory ? {
        id: searchHistory.id,
        method: searchHistory.search_method,
        query: searchHistory.search_method === 'city' 
          ? `${searchHistory.city}, ${searchHistory.country}` 
          : searchHistory.coordinates,
        categories: searchHistory.categories,
        totalResults: searchHistory.total_results,
        processedCount: searchHistory.processed_count,
        status: searchHistory.status
      } : null
    });

  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 });
  }
}

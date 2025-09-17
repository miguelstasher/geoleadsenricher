import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  try {
    const { searchId } = await params;

    if (!searchId) {
      return NextResponse.json({ error: 'Search ID is required' }, { status: 400 });
    }

    // Get search progress from database
    const { data: search, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('id', searchId)
      .single();

    if (error || !search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    // Calculate progress percentage
    let progressPercentage = 0;
    if (search.total_results > 0) {
      progressPercentage = Math.round((search.processed_count / search.total_results) * 100);
    } else if (search.status === 'completed') {
      progressPercentage = 100;
    } else if (search.status === 'in_process') {
      progressPercentage = 50; // Default progress for in-process
    }

    return NextResponse.json({
      id: search.id,
      status: search.status,
      progress: progressPercentage,
      processed_count: search.processed_count || 0,
      total_results: search.total_results || 0,
      method: search.search_method,
      query: search.search_method === 'city' 
        ? `${search.city}, ${search.country}` 
        : search.coordinates,
      categories: search.categories,
      created_at: search.created_at,
      processing_started_at: search.processing_started_at,
      message: search.status === 'completed' 
        ? `Completed! Found ${search.total_results} leads`
        : search.status === 'in_process'
        ? `Processing... ${search.processed_count || 0} of ${search.total_results || 0} completed`
        : search.status === 'pending'
        ? 'Starting extraction...'
        : search.status === 'failed'
        ? 'Extraction failed'
        : 'Unknown status'
    });

  } catch (error) {
    console.error('Error getting progress:', error);
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 });
  }
}

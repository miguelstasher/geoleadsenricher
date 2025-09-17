import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { type, params } = await request.json();

    // Create job record with detailed tracking
    const { data: job, error } = await supabase
      .from('jobs')
      .insert([{
        type,
        params,
        status: 'queued',
        progress: 0,
        created_at: new Date().toISOString(),
        estimated_duration: getEstimatedDuration(type, params),
        priority: getPriority(type, params)
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating job:', error);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    // Immediately start processing (but return quickly)
    processJobAsync(job.id);

    return NextResponse.json({ 
      jobId: job.id, 
      status: 'queued',
      estimatedDuration: job.estimated_duration,
      message: 'Job queued for processing. Use /api/jobs/status/{jobId} to track progress.'
    });

  } catch (error) {
    console.error('Error queuing job:', error);
    return NextResponse.json({ error: 'Failed to queue job' }, { status: 500 });
  }
}

function getEstimatedDuration(type: string, params: any): number {
  // Estimate duration in seconds based on job type and parameters
  if (type === 'coordinates_extraction') {
    const categories = params.searchData?.categories?.length || 1;
    return Math.min(categories * 60, 600); // Max 10 minutes
  }
  if (type === 'city_extraction') {
    return 300; // 5 minutes
  }
  if (type === 'enrichment') {
    const leadCount = params.leadIds?.length || 1;
    return Math.min(leadCount * 3, 900); // Max 15 minutes
  }
  return 60; // Default 1 minute
}

function getPriority(type: string, params: any): number {
  // Higher number = higher priority
  if (type === 'enrichment') return 3;
  if (type === 'coordinates_extraction') return 2;
  return 1;
}

async function processJobAsync(jobId: string) {
  // This runs the actual processing in "chunks" to avoid timeouts
  try {
    // Start first chunk
    await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/jobs/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, chunkIndex: 0 })
    });
  } catch (error) {
    console.error('Error starting async processing:', error);
  }
}

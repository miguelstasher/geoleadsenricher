import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enrichLeadsBatch } from '../../../utils/emailEnrichment';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Global state for tracking enrichment jobs
const enrichmentJobs = new Map<string, {
  status: 'running' | 'completed' | 'cancelled' | 'error';
  progress: {
    completed: number;
    total: number;
    currentLead: string;
  };
  results?: any[];
  error?: string;
  startTime: number;
  estimatedCompletionTime?: number;
}>();

export async function POST(request: NextRequest) {
  try {
    const { leadIds } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Lead IDs are required' }, { status: 400 });
    }

    // Generate unique job ID
    const jobId = `enrich_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get leads from database
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id, name, website, email, email_status')
      .in('id', leadIds);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads found' }, { status: 404 });
    }

    // Filter out leads that already have emails (skip enrichment)
    const leadsToEnrich = leads.filter(lead => 
      !lead.email || lead.email.trim() === '' || lead.email === 'Not Found' || lead.email === 'not_found'
    );

    console.log(`🎯 Enrichment job ${jobId}: ${leads.length} selected leads, ${leadsToEnrich.length} need enrichment`);

    // Initialize job status
    enrichmentJobs.set(jobId, {
      status: 'running',
      progress: {
        completed: 0,
        total: leadsToEnrich.length,
        currentLead: leadsToEnrich.length > 0 ? leadsToEnrich[0].name : 'None'
      },
      startTime: Date.now(),
      estimatedCompletionTime: Date.now() + (leadsToEnrich.length * 5000) // Estimate 5 seconds per lead
    });

    // Start background processing (don't await this)
    processEnrichmentJob(jobId, leadsToEnrich).catch(error => {
      console.error(`❌ Enrichment job ${jobId} failed:`, error);
      const job = enrichmentJobs.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = error.message;
      }
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: `Enrichment started for ${leadsToEnrich.length} leads`,
      leadsToEnrich: leadsToEnrich.length,
      leadsSkipped: leads.length - leadsToEnrich.length,
      estimatedTimeMinutes: Math.ceil(leadsToEnrich.length * 5 / 60)
    });

  } catch (error: any) {
    console.error('Error starting enrichment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Background processing function
async function processEnrichmentJob(jobId: string, leads: any[]) {
  const job = enrichmentJobs.get(jobId);
  if (!job) return;

  try {
    console.log(`🚀 Starting background enrichment job ${jobId} for ${leads.length} leads`);

    // Process leads in batch with progress tracking
    const results = await enrichLeadsBatch(leads, (progress) => {
      const currentJob = enrichmentJobs.get(jobId);
      if (currentJob && currentJob.status === 'running') {
        currentJob.progress = progress;
        
        // Update estimated completion time based on actual progress
        if (progress.completed > 0) {
          const avgTimePerLead = (Date.now() - currentJob.startTime) / progress.completed;
          const remainingLeads = progress.total - progress.completed;
          currentJob.estimatedCompletionTime = Date.now() + (remainingLeads * avgTimePerLead);
        }
      }
    });

    // Check if job was cancelled during processing
    const finalJob = enrichmentJobs.get(jobId);
    if (!finalJob || finalJob.status === 'cancelled') {
      console.log(`⏹️ Enrichment job ${jobId} was cancelled`);
      return;
    }

    // Update database with results
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const result = results[i];
      
      if (result && result.email && 
          result.email !== 'not_found' && 
          result.email !== 'No email found' && 
          result.email !== 'Unknown' &&
          !result.email.toLowerCase().includes('no email') &&
          !result.email.toLowerCase().includes('not found') &&
          !result.email.toLowerCase().includes('unknown') &&
          result.email.includes('@')) {
        // Update lead with enriched email
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            email: result.email,
            email_status: result.email_status,
            last_modified: new Date().toISOString().slice(0, 16).replace('T', ' ')
          })
          .eq('id', lead.id);

        if (updateError) {
          console.error(`❌ Failed to update lead ${lead.id}:`, updateError);
        } else {
          console.log(`✅ Updated lead ${lead.name} with email: ${result.email}`);
        }
      } else if (result && result.email_status === 'not_found') {
        // Update lead with not_found status
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            email_status: 'not_found',
            last_modified: new Date().toISOString().slice(0, 16).replace('T', ' ')
          })
          .eq('id', lead.id);

        if (updateError) {
          console.error(`❌ Failed to update lead ${lead.id} status:`, updateError);
        } else {
          console.log(`📝 Updated lead ${lead.name} status: not_found`);
        }
      }
    }

    // Mark job as completed
    if (finalJob) {
      finalJob.status = 'completed';
      finalJob.results = results;
      finalJob.progress.currentLead = 'Completed';
    }

    console.log(`✅ Enrichment job ${jobId} completed successfully`);

  } catch (error: any) {
    console.error(`❌ Enrichment job ${jobId} failed:`, error);
    const job = enrichmentJobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.error = error.message;
    }
  }
}

// GET request to check job status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
  }

  const job = enrichmentJobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Calculate progress percentage and time estimates
  const progressPercentage = job.progress.total > 0 
    ? Math.round((job.progress.completed / job.progress.total) * 100)
    : 0;

  const timeElapsed = Date.now() - job.startTime;
  const estimatedTimeRemaining = job.estimatedCompletionTime 
    ? Math.max(0, job.estimatedCompletionTime - Date.now())
    : 0;

  return NextResponse.json({
    jobId,
    status: job.status,
    progress: {
      ...job.progress,
      percentage: progressPercentage,
      timeElapsedMs: timeElapsed,
      timeElapsedMinutes: Math.round(timeElapsed / 60000),
      estimatedTimeRemainingMs: estimatedTimeRemaining,
      estimatedTimeRemainingMinutes: Math.round(estimatedTimeRemaining / 60000)
    },
    results: job.status === 'completed' ? job.results : undefined,
    error: job.error
  });
}

// DELETE request to cancel job
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
  }

  const job = enrichmentJobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.status === 'running') {
    job.status = 'cancelled';
    console.log(`⏹️ Enrichment job ${jobId} cancelled by user`);
    
    return NextResponse.json({
      success: true,
      message: 'Enrichment job cancelled successfully'
    });
  } else {
    return NextResponse.json({
      error: `Cannot cancel job with status: ${job.status}`
    }, { status: 400 });
  }
} 
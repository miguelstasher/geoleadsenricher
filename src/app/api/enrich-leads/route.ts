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

    // Process leads using the original working enrichment function
    const results = await enrichLeadsBatch(leads, (progress) => {
      const currentJob = enrichmentJobs.get(jobId);
      if (currentJob && currentJob.status === 'running') {
        currentJob.progress = progress;
        console.log(`📈 Progress update for job ${jobId}:`, progress);
        
        // Update estimated completion time based on actual progress
        if (progress.completed > 0) {
          const avgTimePerLead = (Date.now() - currentJob.startTime) / progress.completed;
          const remainingLeads = progress.total - progress.completed;
          currentJob.estimatedCompletionTime = Date.now() + (remainingLeads * avgTimePerLead);
        }
      }
    });

    console.log(`📋 Enrichment results for job ${jobId}:`, results);

    // Check if job was cancelled during processing
    const finalJob = enrichmentJobs.get(jobId);
    if (!finalJob || finalJob.status === 'cancelled') {
      console.log(`⏹️ Enrichment job ${jobId} was cancelled`);
      return;
    }

    console.log(`💾 Starting database updates for job ${jobId}...`);

    // Update database with results
    let updatedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const result = results[i];
      
      console.log(`🔍 Processing lead ${i + 1}/${leads.length}: ${lead.name}`, {
        leadId: lead.id,
        resultEmail: result?.email,
        resultStatus: result?.email_status
      });
      
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
          errorCount++;
        } else {
          console.log(`✅ Updated lead ${lead.name} with email: ${result.email}`);
          updatedCount++;
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
          errorCount++;
        } else {
          console.log(`📝 Updated lead ${lead.name} status: not_found`);
          updatedCount++;
        }
      } else {
        console.log(`⚠️ Skipping lead ${lead.name} - no valid result`);
      }
    }

    console.log(`📊 Database update summary for job ${jobId}:`, {
      totalLeads: leads.length,
      updatedCount,
      errorCount,
      skippedCount: leads.length - updatedCount - errorCount
    });

    // Mark job as completed
    if (finalJob) {
      finalJob.status = 'completed';
      finalJob.results = results;
      finalJob.progress.currentLead = 'Completed';
      finalJob.progress.completed = leads.length;
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
      progress: job.progress,
      results: job.results,
      error: job.error,
      startTime: job.startTime,
      estimatedCompletionTime: job.estimatedCompletionTime
    });

  } catch (error: any) {
    console.error('Error fetching job status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    if (job.status === 'running') {
      job.status = 'cancelled';
      console.log(`⏹️ Enrichment job ${jobId} cancelled by user`);
    }

    return NextResponse.json({ success: true, message: 'Job cancelled successfully' });

  } catch (error: any) {
    console.error('Error cancelling job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
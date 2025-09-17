import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 50000; // 50 seconds (safe margin under 60s limit)

  try {
    const { jobId, chunkIndex = 0 } = await request.json();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Update job status
    await supabase
      .from('jobs')
      .update({ 
        status: 'processing',
        current_message: `Processing chunk ${chunkIndex + 1}`,
        progress: Math.max(job.progress || 0, 5) // At least 5% progress
      })
      .eq('id', jobId);

    let result = { completed: false, processed: 0, nextChunk: chunkIndex + 1 };

    // Process based on job type
    if (job.type === 'coordinates_extraction') {
      result = await processCoordinatesChunk(job, chunkIndex, MAX_EXECUTION_TIME, startTime);
    } else if (job.type === 'city_extraction') {
      result = await processCityChunk(job, chunkIndex, MAX_EXECUTION_TIME, startTime);
    } else if (job.type === 'enrichment') {
      result = await processEnrichmentChunk(job, chunkIndex, MAX_EXECUTION_TIME, startTime);
    }

    // Update progress
    const newProgress = Math.min(95, Math.max(job.progress || 0, 10 + (result.processed * 2)));
    await supabase
      .from('jobs')
      .update({ 
        progress: newProgress,
        current_message: `Processed ${result.processed} items in chunk ${chunkIndex + 1}`
      })
      .eq('id', jobId);

    if (result.completed) {
      // Job finished
      await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          current_message: 'Processing completed successfully'
        })
        .eq('id', jobId);

      return NextResponse.json({ 
        success: true, 
        completed: true,
        message: 'Job completed successfully'
      });
    } else {
      // Schedule next chunk (fire and forget)
      setTimeout(() => {
        fetch(`${request.nextUrl.origin}/api/jobs/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, chunkIndex: result.nextChunk })
        }).catch(console.error);
      }, 2000); // 2 second delay between chunks

      return NextResponse.json({ 
        success: true, 
        completed: false,
        processed: result.processed,
        nextChunk: result.nextChunk,
        message: `Chunk ${chunkIndex + 1} completed, continuing with chunk ${result.nextChunk + 1}`
      });
    }

  } catch (error) {
    console.error('Job execution error:', error);
    
    // Mark job as failed
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return NextResponse.json({ error: 'Job execution failed' }, { status: 500 });
  }
}

async function processCoordinatesChunk(job: any, chunkIndex: number, maxTime: number, startTime: number) {
  const { searchId, searchData } = job.params;
  const ITEMS_PER_CHUNK = 10; // Process 10 places per chunk
  
  try {
    // Import Google Maps functions
    const { performCoordinatesSearch, getPlaceDetails, formatPlaceForDatabase } = await import('@/utils/googleMapsScraper');
    
    // Parse coordinates
    const [lat, lng] = searchData.coordinates.split(',').map((coord: string) => parseFloat(coord.trim()));
    const center = { lat, lng };

    // Get all places (but we'll process in chunks)
    let allPlaces = [];
    
    if (chunkIndex === 0) {
      // First chunk - get all places and store in job params for future chunks
      allPlaces = await performCoordinatesSearch(center, searchData.radius, searchData.categories);
      
      // Store places in job for future chunks
      await supabase
        .from('jobs')
        .update({ 
          params: { 
            ...job.params, 
            allPlaces: allPlaces.slice(0, 100) // Limit to 100 places max
          }
        })
        .eq('id', job.id);
    } else {
      // Use stored places from previous chunks
      allPlaces = job.params.allPlaces || [];
    }

    // Process chunk
    const startIdx = chunkIndex * ITEMS_PER_CHUNK;
    const endIdx = Math.min(startIdx + ITEMS_PER_CHUNK, allPlaces.length);
    const chunkPlaces = allPlaces.slice(startIdx, endIdx);
    
    let processed = 0;

    for (const place of chunkPlaces) {
      // Check time limit
      if (Date.now() - startTime > maxTime) {
        break;
      }

      try {
        const placeDetails = await getPlaceDetails(place.place_id);
        if (placeDetails) {
          const leadData = formatPlaceForDatabase(placeDetails, place.category || 'Business', {
            currency: searchData.currency,
            created_by: searchData.created_by
          });

          if (leadData) {
            await supabase.from('leads').insert([leadData]);
            processed++;
          }
        }
      } catch (error) {
        console.error('Error processing place:', error);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update search history
    if (searchId) {
      const totalProcessed = (chunkIndex * ITEMS_PER_CHUNK) + processed;
      await supabase
        .from('search_history')
        .update({ 
          processed_count: totalProcessed,
          total_results: allPlaces.length,
          status: endIdx >= allPlaces.length ? 'completed' : 'in_process'
        })
        .eq('id', searchId);
    }

    return {
      completed: endIdx >= allPlaces.length,
      processed,
      nextChunk: chunkIndex + 1
    };

  } catch (error) {
    console.error('Coordinates chunk processing error:', error);
    throw error;
  }
}

async function processCityChunk(job: any, chunkIndex: number, maxTime: number, startTime: number) {
  // Similar implementation for city extraction
  return { completed: true, processed: 0, nextChunk: chunkIndex + 1 };
}

async function processEnrichmentChunk(job: any, chunkIndex: number, maxTime: number, startTime: number) {
  const { leadIds } = job.params;
  const ITEMS_PER_CHUNK = 5; // Process 5 leads per chunk (enrichment is slower)
  
  const startIdx = chunkIndex * ITEMS_PER_CHUNK;
  const endIdx = Math.min(startIdx + ITEMS_PER_CHUNK, leadIds.length);
  const chunkLeadIds = leadIds.slice(startIdx, endIdx);
  
  let processed = 0;

  for (const leadId of chunkLeadIds) {
    if (Date.now() - startTime > maxTime) break;

    try {
      // Get lead data
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (lead && lead.website && (!lead.email || lead.email === 'not_found')) {
        // Import enrichment function
        const { enrichLeadEmail } = await import('@/utils/emailEnrichment');
        
        // Enrich email
        const enrichmentResult = await enrichLeadEmail(lead);
        
        // Update lead
        if (enrichmentResult.email && enrichmentResult.email !== 'not_found') {
          await supabase
            .from('leads')
            .update({
              email: enrichmentResult.email,
              email_status: enrichmentResult.email_status,
              last_modified: new Date().toISOString()
            })
            .eq('id', leadId);
          
          processed++;
        }
      }

      // Delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error('Error enriching lead:', error);
    }
  }

  return {
    completed: endIdx >= leadIds.length,
    processed,
    nextChunk: chunkIndex + 1
  };
}

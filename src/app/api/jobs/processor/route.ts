import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    console.log('🔄 Cron job processor running...');

    // Get pending jobs
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(3); // Process max 3 jobs at once

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs' });
    }

    console.log(`Found ${jobs.length} pending jobs`);

    // Process each job
    for (const job of jobs) {
      try {
        await processJob(job);
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        
        // Mark job as failed
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }

    return NextResponse.json({ 
      message: `Processed ${jobs.length} jobs`,
      processedJobs: jobs.map(j => j.id)
    });

  } catch (error) {
    console.error('Cron processor error:', error);
    return NextResponse.json({ error: 'Processor failed' }, { status: 500 });
  }
}

async function processJob(job: any) {
  console.log(`Processing job ${job.id} of type ${job.type}`);

  // Update job to processing
  await supabase
    .from('jobs')
    .update({ status: 'processing', progress: 10 })
    .eq('id', job.id);

  if (job.type === 'coordinates_extraction') {
    await processCoordinatesExtraction(job);
  } else if (job.type === 'city_extraction') {
    await processCityExtraction(job);
  } else if (job.type === 'enrichment') {
    await processEnrichment(job);
  }

  // Mark as completed
  await supabase
    .from('jobs')
    .update({ 
      status: 'completed', 
      progress: 100,
      completed_at: new Date().toISOString()
    })
    .eq('id', job.id);
}

async function processCoordinatesExtraction(job: any) {
  const { searchId, searchData } = job.params;
  
  // Import Google Maps functions
  const { performCoordinatesSearch, getPlaceDetails, formatPlaceForDatabase } = await import('@/utils/googleMapsScraper');
  
  // Parse coordinates
  const [lat, lng] = searchData.coordinates.split(',').map((coord: string) => parseFloat(coord.trim()));
  const center = { lat, lng };

  // Progress callback
  const progressCallback = async (current: number, total: number, message: string) => {
    const progress = Math.floor((current / total) * 80) + 10; // 10-90% range
    await supabase
      .from('jobs')
      .update({ 
        progress,
        current_message: message
      })
      .eq('id', job.id);
  };

  // Get places (limit to avoid timeout)
  const places = await performCoordinatesSearch(
    center,
    searchData.radius,
    searchData.categories.slice(0, 10), // Limit categories to avoid timeout
    progressCallback
  );

  // Process places in small batches
  const BATCH_SIZE = 5;
  let processedCount = 0;

  for (let i = 0; i < Math.min(places.length, 20); i += BATCH_SIZE) { // Max 20 places
    const batch = places.slice(i, i + BATCH_SIZE);
    
    for (const place of batch) {
      try {
        const placeDetails = await getPlaceDetails(place.place_id);
        if (placeDetails) {
          const leadData = formatPlaceForDatabase(placeDetails, place.category || 'Business', {
            currency: searchData.currency,
            created_by: searchData.created_by
          });

          if (leadData) {
            await supabase.from('leads').insert([leadData]);
            processedCount++;
          }
        }
      } catch (error) {
        console.error('Error processing place:', error);
      }

      // Update progress
      const progress = Math.floor((processedCount / Math.min(places.length, 20)) * 10) + 90;
      await supabase
        .from('jobs')
        .update({ 
          progress,
          current_message: `Processed ${processedCount} places`
        })
        .eq('id', job.id);
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Update search history
  if (searchId) {
    await supabase
      .from('search_history')
      .update({ 
        status: 'completed',
        total_results: processedCount,
        processed_count: processedCount
      })
      .eq('id', searchId);
  }
}

async function processCityExtraction(job: any) {
  // Similar implementation for city extraction
  console.log('Processing city extraction...');
  // Implementation would be similar to coordinates but use performCitySearch
}

async function processEnrichment(job: any) {
  // Process enrichment jobs
  console.log('Processing enrichment...');
  // Implementation for email enrichment
}

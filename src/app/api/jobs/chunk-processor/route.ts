import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { jobId, chunkIndex = 0, totalChunks = 1 } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Process small chunk (max 5 places at a time)
    const CHUNK_SIZE = 5;
    const startTime = Date.now();
    const MAX_PROCESSING_TIME = 8000; // 8 seconds max

    let processed = 0;
    let shouldContinue = true;

    // Update job status
    await supabase
      .from('jobs')
      .update({ 
        status: 'processing',
        current_message: `Processing chunk ${chunkIndex + 1}/${totalChunks}`,
        progress: Math.floor((chunkIndex / totalChunks) * 100)
      })
      .eq('id', jobId);

    // Process chunk based on job type
    if (job.type === 'coordinates_extraction' || job.type === 'city_extraction') {
      const result = await processExtractionChunk(job, chunkIndex, CHUNK_SIZE, MAX_PROCESSING_TIME);
      processed = result.processed;
      shouldContinue = result.shouldContinue;
    }

    // If more work to do, schedule next chunk
    if (shouldContinue && (Date.now() - startTime) < MAX_PROCESSING_TIME) {
      // Schedule next chunk
      fetch(`${request.nextUrl.origin}/api/jobs/chunk-processor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          chunkIndex: chunkIndex + 1,
          totalChunks
        })
      }).catch(console.error); // Fire and forget
    } else if (!shouldContinue) {
      // Job completed
      await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    return NextResponse.json({ 
      success: true, 
      processed,
      shouldContinue,
      nextChunk: shouldContinue ? chunkIndex + 1 : null
    });

  } catch (error) {
    console.error('Chunk processor error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function processExtractionChunk(job: any, chunkIndex: number, chunkSize: number, maxTime: number) {
  const { searchId, searchData } = job.params;
  const startTime = Date.now();
  let processed = 0;

  try {
    // Import Google Maps functions
    const { performCoordinatesSearch, getPlaceDetails, formatPlaceForDatabase } = await import('@/utils/googleMapsScraper');

    // Get places for this chunk (simulate getting a subset)
    // In reality, you'd maintain state about which places have been processed
    const allPlaces = searchData.search_method === 'coordinates' 
      ? await performCoordinatesSearch(
          { lat: parseFloat(searchData.coordinates.split(',')[0]), lng: parseFloat(searchData.coordinates.split(',')[1]) },
          searchData.radius,
          searchData.categories.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize)
        )
      : []; // City search would be similar

    // Process places one by one with time limit
    for (const place of allPlaces.slice(0, chunkSize)) {
      if (Date.now() - startTime > maxTime) break;

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
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { 
      processed, 
      shouldContinue: processed === chunkSize && allPlaces.length > chunkSize 
    };

  } catch (error) {
    console.error('Chunk processing error:', error);
    return { processed, shouldContinue: false };
  }
}

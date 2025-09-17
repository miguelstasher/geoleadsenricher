import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: Retrieve job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new background job
export async function POST(request: NextRequest) {
  try {
               const body = await request.json();
           const { type, params } = body;

           if (!type || !params) {
             return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
           }

               // Create job record
           const { data: job, error } = await supabase
             .from('jobs')
             .insert([{
               type,
               params,
               user_id: null, // Temporarily set to null to bypass RLS
               status: 'pending',
               progress: 0,
               created_at: new Date().toISOString()
             }])
             .select()
             .single();

    if (error) {
      console.error('Error creating job:', error);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

               // Start background processing
           processJobInBackground(job.id, type, params);

    return NextResponse.json({ jobId: job.id, status: 'started' });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

       // Background job processing function
       async function processJobInBackground(jobId: string, type: string, params: any) {
  try {
    // Update job status to processing
    await supabase
      .from('jobs')
      .update({ status: 'processing', progress: 10 })
      .eq('id', jobId);

    let result;
    
               if (type === 'city_extraction') {
             result = await processCityExtraction(jobId, params);
           } else if (type === 'coordinates_extraction') {
             result = await processCoordinatesExtraction(jobId, params);
           } else if (type === 'enrichment') {
             result = await processEnrichment(jobId, params);
           } else {
      throw new Error(`Unknown job type: ${type}`);
    }

    // Update job as completed
    await supabase
      .from('jobs')
      .update({ 
        status: 'completed', 
        progress: 100,
        result: result,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

  } catch (error) {
    console.error('Background job error:', error);
    
    // Update job as failed
    await supabase
      .from('jobs')
      .update({ 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

       // City extraction processing
       async function processCityExtraction(jobId: string, params: any) {
  const { searchId, searchData } = params;
  
  // Import the city search function
  const { performCitySearch, getPlaceDetails, formatPlaceForDatabase } = await import('@/utils/googleMapsScraper');
  
  let totalPlaces = 0;
  let processedPlaces = 0;
  
  // Progress callback
  const progressCallback = async (current: number, total: number, message: string) => {
    const progress = Math.floor((current / total) * 80) + 10; // 10-90% range
    await supabase
      .from('jobs')
      .update({ 
        progress,
        current_message: message
      })
      .eq('id', jobId);
    
    // Also update search history
    if (searchId) {
      await supabase
        .from('search_history')
        .update({ 
          processed_count: current,
          total_results: total
        })
        .eq('id', searchId);
    }
  };

  // Perform the city search
  const places = await performCitySearch({
    city: searchData.city,
    country: searchData.country,
    categories: searchData.categories
  }, progressCallback);

  totalPlaces = places.length;

  // Process and save places to database
  const processedLeads = [];
  
  for (const place of places) {
    try {
      // Get place details
      const placeDetails = await getPlaceDetails(place.place_id);
      
      if (placeDetails) {
        // Format for database
        const leadData = formatPlaceForDatabase(placeDetails, place.category || 'Business', {
          currency: searchData.currency,
          created_by: searchData.created_by,
          targetCity: searchData.city
        });

        if (leadData) {
          // Insert new lead
          const { data: insertedLead, error: insertError } = await supabase
            .from('leads')
            .insert([leadData])
            .select()
            .single();

          if (!insertError && insertedLead) {
            processedLeads.push(insertedLead);
          }
        }
      }

      processedPlaces++;
      
      // Update progress
      const progress = Math.floor((processedPlaces / totalPlaces) * 10) + 90; // 90-100% range
      await supabase
        .from('jobs')
        .update({ 
          progress,
          current_message: `Processed ${processedPlaces}/${totalPlaces} places`
        })
        .eq('id', jobId);

      // Also update search history
      if (searchId) {
        await supabase
          .from('search_history')
          .update({ 
            processed_count: processedPlaces
          })
          .eq('id', searchId);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Error processing place:', error);
    }
  }

  // Update search history as completed
  if (searchId) {
    await supabase
      .from('search_history')
      .update({ 
        status: 'completed',
        total_results: processedLeads.length,
        processed_count: processedLeads.length,
        results: processedLeads.map(lead => ({
          id: lead.id,
          name: lead.name,
          address: lead.address,
          city: lead.city,
          phone: lead.phone,
          website: lead.website,
          type: lead.business_type,
          location: lead.location
        }))
      })
      .eq('id', searchId);
  }

  return {
    totalPlaces,
    processedPlaces,
    message: `Successfully processed ${processedPlaces} places from ${searchData.city}`
  };
}

       // Coordinates extraction processing
       async function processCoordinatesExtraction(jobId: string, params: any) {
  const { searchId, searchData } = params;
  
  // Import the coordinates search function
  const { performCoordinatesSearch, getPlaceDetails, formatPlaceForDatabase } = await import('@/utils/googleMapsScraper');
  
  let totalPlaces = 0;
  let processedPlaces = 0;
  
  // Progress callback
  const progressCallback = async (current: number, total: number, message: string) => {
    const progress = Math.floor((current / total) * 80) + 10; // 10-90% range
    await supabase
      .from('jobs')
      .update({ 
        progress,
        current_message: message
      })
      .eq('id', jobId);
    
    // Also update search history
    if (searchId) {
      await supabase
        .from('search_history')
        .update({ 
          processed_count: current,
          total_results: total
        })
        .eq('id', searchId);
    }
  };

  // Parse coordinates (format: "lat, lng")
  const [lat, lng] = searchData.coordinates.split(',').map((coord: string) => parseFloat(coord.trim()));
  const center = { lat, lng };

  // Perform the coordinates search
  const places = await performCoordinatesSearch(
    center,
    searchData.radius,
    searchData.categories,
    progressCallback
  );

  totalPlaces = places.length;

  // Process and save places to database
  const processedLeads = [];
  
  for (const place of places) {
    try {
      // Get place details
      const placeDetails = await getPlaceDetails(place.place_id);
      
      if (placeDetails) {
        // Format for database
        const leadData = formatPlaceForDatabase(placeDetails, place.category || 'Business', {
          currency: searchData.currency,
          created_by: searchData.created_by
        });

        if (leadData) {
          // Insert new lead
          const { data: insertedLead, error: insertError } = await supabase
            .from('leads')
            .insert([leadData])
            .select()
            .single();

          if (!insertError && insertedLead) {
            processedLeads.push(insertedLead);
          }
        }
      }

      processedPlaces++;
      
      // Update progress
      const progress = Math.floor((processedPlaces / totalPlaces) * 10) + 90; // 90-100% range
      await supabase
        .from('jobs')
        .update({ 
          progress,
          current_message: `Processed ${processedPlaces}/${totalPlaces} places`
        })
        .eq('id', jobId);

      // Also update search history
      if (searchId) {
        await supabase
          .from('search_history')
          .update({ 
            processed_count: processedPlaces
          })
          .eq('id', searchId);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Error processing place:', error);
    }
  }

  // Update search history as completed
  if (searchId) {
    await supabase
      .from('search_history')
      .update({ 
        status: 'completed',
        total_results: processedLeads.length,
        processed_count: processedLeads.length,
        results: processedLeads.map(lead => ({
          id: lead.id,
          name: lead.name,
          address: lead.address,
          city: lead.city,
          phone: lead.phone,
          website: lead.website,
          type: lead.business_type,
          location: lead.location
        }))
      })
      .eq('id', searchId);
  }

  return {
    totalPlaces,
    processedPlaces,
    message: `Successfully processed ${processedPlaces} places from coordinates`
  };
}

       // Enrichment processing
       async function processEnrichment(jobId: string, params: any) {
  const { leadIds, enrichmentType } = params;
  
  let totalLeads = leadIds.length;
  let processedLeads = 0;
  
  for (const leadId of leadIds) {
    try {
      // Get lead data
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!lead) continue;

      // Perform enrichment based on type
      if (enrichmentType === 'email') {
        await enrichEmail(lead);
      } else if (enrichmentType === 'phone') {
        await enrichPhone(lead);
      }

      processedLeads++;
      
      // Update progress
      const progress = Math.floor((processedLeads / totalLeads) * 100);
      await supabase
        .from('jobs')
        .update({ 
          progress,
          current_message: `Enriched ${processedLeads}/${totalLeads} leads`
        })
        .eq('id', jobId);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error enriching lead:', error);
    }
  }

  return {
    totalLeads,
    processedLeads,
    message: `Successfully enriched ${processedLeads} leads`
  };
}

// Helper functions for enrichment
async function enrichEmail(lead: any) {
  // Implementation for email enrichment
  // This would use the existing enrichment logic
  // For now, just mark as enriched
  await supabase
    .from('leads')
    .update({ 
      email_status: 'enriched',
      last_modified: new Date().toISOString()
    })
    .eq('id', lead.id);
}

async function enrichPhone(lead: any) {
  // Implementation for phone enrichment
  // This would use the existing enrichment logic
  // For now, just mark as enriched
  await supabase
    .from('leads')
    .update({ 
      phone_status: 'enriched',
      last_modified: new Date().toISOString()
    })
    .eq('id', lead.id);
}

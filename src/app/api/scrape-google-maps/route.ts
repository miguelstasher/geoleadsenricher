import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  performCoordinatesSearch, 
  performCitySearch,
  getPlaceDetails, 
  formatPlaceForDatabase,
  SearchPoint,
  CitySearchParams,
  GooglePlace 
} from '../../../utils/googleMapsScraper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { searchId } = await request.json();

    if (!searchId) {
      return NextResponse.json({ error: 'Search ID is required' }, { status: 400 });
    }

    // Get the search details from database
    const { data: searchData, error: fetchError } = await supabase
      .from('search_history')
      .select('*')
      .eq('id', searchId)
      .single();

    if (fetchError || !searchData) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    // Update status to 'in_process'
    await supabase
      .from('search_history')
      .update({ 
        status: 'in_process',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', searchId);

    // Start the scraping process in the background
    processGoogleMapsScraping(searchId, searchData).catch(error => {
      console.error('Background scraping error:', error);
    });

    return NextResponse.json({ success: true, message: 'Scraping started' });

  } catch (error) {
    console.error('Error starting scraping:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processGoogleMapsScraping(searchId: string, searchData: any) {
  try {
    console.log('Starting Google Maps scraping for:', searchData);

    let allPlaces: GooglePlace[] = [];

    if (searchData.search_method === 'coordinates') {
      // Parse coordinates (format: "lat, lng")
      const [lat, lng] = searchData.coordinates.split(',').map((coord: string) => parseFloat(coord.trim()));
      const center: SearchPoint = { lat, lng };
      
      // Progress callback to update database
      const progressCallback = async (current: number, total: number, message: string) => {
        console.log(`Progress: ${current}/${total} - ${message}`);
        await supabase
          .from('search_history')
          .update({ 
            processed_count: current,
            total_results: total,
            // You could add a progress_message field if needed
          })
          .eq('id', searchId);
      };

      // Perform the coordinate-based search (9-point strategy)
      allPlaces = await performCoordinatesSearch(
        center,
        searchData.radius,
        searchData.categories,
        progressCallback
      );

    } else if (searchData.search_method === 'city') {
      // Progress callback to update database
      const progressCallback = async (current: number, total: number, message: string) => {
        console.log(`Progress: ${current}/${total} - ${message}`);
        await supabase
          .from('search_history')
          .update({ 
            processed_count: current,
            total_results: total,
            // You could add a progress_message field if needed
          })
          .eq('id', searchId);
      };

      // Prepare city search parameters
      const citySearchParams: CitySearchParams = {
        city: searchData.city,
        country: searchData.country,
        categories: searchData.categories
      };

      // Perform the comprehensive city-based search (9-directional strategy)
      allPlaces = await performCitySearch(citySearchParams, progressCallback);
    }

    console.log(`Found ${allPlaces.length} unique places to process`);

    // Update initial total count
    await supabase
      .from('search_history')
      .update({ 
        total_results: allPlaces.length
      })
      .eq('id', searchId);

    // Process each place individually (fetch details and save to database)
    const processedLeads = [];
    
    for (let i = 0; i < allPlaces.length; i++) {
      const place = allPlaces[i];
      
      try {
        // Get detailed place information
        const placeDetails = await getPlaceDetails(place.place_id);
        
        // Format for database
        const leadData = formatPlaceForDatabase(placeDetails, place.category || 'Business', {
          currency: searchData.currency,
          created_by: searchData.created_by
        });

        // Check if lead already exists (prevent duplicates)
        // TEMPORARILY DISABLED: Allow duplicates to be added
        /*
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('external_id', leadData.external_id)
          .single();

        if (!existingLead) {
        */
          // Insert new lead
          const { data: insertedLead, error: insertError } = await supabase
            .from('leads')
            .insert([leadData])
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting lead:', insertError);
          } else {
            processedLeads.push(insertedLead);
            console.log(`Added lead: ${leadData.name}`);
          }
        /*
        } else {
          console.log(`Skipped duplicate: ${leadData.name}`);
        }
        */

        // Update progress
        await supabase
          .from('search_history')
          .update({ 
            processed_count: i + 1
          })
          .eq('id', searchId);

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing place ${place.name}:`, error);
        // Continue with next place even if one fails
      }
    }

    console.log(`Processing completed. Found ${allPlaces.length} places, processed ${processedLeads.length} leads successfully.`);

    // Mark as completed with actual processed count
    const completionUpdate = {
      status: 'completed' as const,
      total_results: processedLeads.length, // Use actual processed count, not all places found
      processed_count: processedLeads.length,
      results: processedLeads.map(lead => ({
        id: lead.id,
        name: lead.name,
        address: lead.address,
        city: lead.city,
        phone: lead.phone,
        website: lead.website,
        type: lead.business_type,
        location: lead.location // Use the location field directly instead of trying to construct from latitude/longitude
      }))
    };

    const { error: completionError } = await supabase
      .from('search_history')
      .update(completionUpdate)
      .eq('id', searchId);

    if (completionError) {
      console.error('Error updating completion status:', completionError);
    } else {
      console.log(`✅ Search ${searchId} marked as completed with ${processedLeads.length} results`);
    }

    // Also save individual search results in the search_results table for reference
    const searchResults = processedLeads.map(lead => ({
      search_id: searchId,
      lead_id: lead.id,
      name: lead.name,
      address: lead.address,
      phone: lead.phone,
      website: lead.website,
      business_type: lead.business_type,
      location: lead.location // Use the location field instead of separate latitude/longitude
    }));

    if (searchResults.length > 0) {
      await supabase
        .from('search_results')
        .insert(searchResults);
    }

  } catch (error) {
    console.error('Error during scraping:', error);
    
    // Mark as failed
    await supabase
      .from('search_history')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', searchId);
  }
} 
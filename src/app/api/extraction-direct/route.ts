import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { searchId } = await request.json();

    console.log('🚀 Starting DIRECT extraction for search:', searchId);

    // Get search data
    const { data: searchData, error: fetchError } = await supabase
      .from('search_history')
      .select('*')
      .eq('id', searchId)
      .single();

    if (fetchError || !searchData) {
      console.error('❌ Search not found:', fetchError);
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    console.log('📋 Search data:', searchData);

    // Update status to processing
    await supabase
      .from('search_history')
      .update({ status: 'in_process' })
      .eq('id', searchId);

    // Use hardcoded Google Maps API key (same as localhost)
    const GOOGLE_API_KEY = 'AIzaSyCWLWBJJeNyMsV1ieKMQl53OJuzZLOYP-k';
    
    console.log('🗺️ Using Google Maps API key:', GOOGLE_API_KEY ? 'Available' : 'Missing');

    let allPlaces = [];

    if (searchData.search_method === 'coordinates') {
      console.log('📍 Processing coordinates search...');
      
      // Parse coordinates
      const [lat, lng] = searchData.coordinates.split(',').map(coord => parseFloat(coord.trim()));
      console.log('📍 Coordinates:', lat, lng);
      
      // Simple single-point search (not 9-point to avoid timeout)
      for (const category of searchData.categories) {
        console.log(`🔍 Searching for ${category} near ${lat}, ${lng}`);
        
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${searchData.radius}&type=${category}&key=${GOOGLE_API_KEY}`;
        
        try {
          const response = await fetch(url);
          const data = await response.json();
          
          console.log(`📊 Google Maps response for ${category}:`, {
            status: data.status,
            results_count: data.results?.length || 0,
            error: data.error_message
          });
          
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            console.log(`✅ Found ${data.results.length} places for ${category}`);
            allPlaces.push(...data.results.map(place => ({ ...place, category })));
          } else {
            console.log(`❌ No results for ${category}. Status: ${data.status}, Error: ${data.error_message}`);
          }
          
          // Small delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Error searching ${category}:`, error);
        }
      }
    }

    console.log(`🔄 Total places found: ${allPlaces.length}`);

    // Remove duplicates
    const uniquePlaces = allPlaces.filter((place, index, self) => 
      self.findIndex(p => p.place_id === place.place_id) === index
    );

    console.log(`🔄 Unique places after deduplication: ${uniquePlaces.length}`);

    // Process first 10 places only (to avoid timeout)
    const placesToProcess = uniquePlaces.slice(0, 10);
    let processedCount = 0;

    for (const [index, place] of placesToProcess.entries()) {
      console.log(`🏢 Processing place ${index + 1}/${placesToProcess.length}: ${place.name}`);
      
      try {
        // Get place details
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,geometry,address_components&key=${GOOGLE_API_KEY}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.result) {
          const placeDetails = detailsData.result;
          
          // Extract city and country
          let city = searchData.city || 'Unknown';
          let country = 'Unknown';
          
          if (placeDetails.address_components) {
            for (const component of placeDetails.address_components) {
              if (component.types.includes('locality')) {
                city = component.long_name;
              }
              if (component.types.includes('country')) {
                country = component.long_name;
              }
            }
          }
          
          // Create lead data (same format as localhost)
          const leadData = {
            external_id: `gmp_${place.place_id}`,
            name: placeDetails.name,
            phone: placeDetails.formatted_phone_number || null,
            website: placeDetails.website || null,
            address: placeDetails.formatted_address || null,
            city: city,
            country: country,
            business_type: place.category || 'Business',
            poi: place.vicinity || null,
            currency: searchData.currency,
            created_by: searchData.created_by,
            record_owner: searchData.created_by,
            latitude: placeDetails.geometry?.location?.lat,
            longitude: placeDetails.geometry?.location?.lng,
            email: null,
            email_status: 'not_found',
            campaign: null,
            campaign_status: null,
            upload_status: null,
            last_modified: new Date().toISOString()
          };

          console.log(`💾 Saving lead: ${leadData.name}`);

          // Insert to database
          const { error: insertError } = await supabase
            .from('leads')
            .insert([leadData]);

          if (!insertError) {
            processedCount++;
            console.log(`✅ Successfully saved: ${leadData.name}`);
          } else {
            console.error(`❌ Error saving ${leadData.name}:`, insertError);
          }
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error processing place ${place.name}:`, error);
      }
    }

    // Update search as completed
    await supabase
      .from('search_history')
      .update({ 
        status: 'completed',
        total_results: processedCount,
        processed_count: processedCount
      })
      .eq('id', searchId);

    console.log(`🎉 Extraction completed! Processed ${processedCount} leads`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total_found: uniquePlaces.length,
      message: `Successfully extracted ${processedCount} leads`
    });

  } catch (error) {
    console.error('❌ Direct extraction error:', error);
    
    return NextResponse.json({
      error: 'Direct extraction failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

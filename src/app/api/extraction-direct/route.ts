import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { searchId } = await request.json();

    console.log('🚀 Starting DIRECT extraction for search:', searchId);
    console.log('🔑 Google Maps API Key available:', !!GOOGLE_API_KEY);
    
    if (!GOOGLE_API_KEY) {
      console.error('❌ Google Maps API Key is missing');
      return NextResponse.json({ error: 'Google Maps API Key is missing' }, { status: 500 });
    }

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
      .update({ 
        status: 'in_process',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', searchId);

    console.log('🗺️ Using Google Maps API key:', GOOGLE_API_KEY ? 'Available' : 'Missing');

    let allPlaces = [];

    // Map frontend categories to Google Places API types (EXACT LOCALHOST LOGIC!)
    const categoryMapping: { [key: string]: string[] } = {
      'Hotel': ['lodging'], // We'll filter by name keywords after API call
      'Aparthotel': ['lodging'], // We'll filter by name keywords after API call
      'Restaurant': ['restaurant'],
      'Bar': ['bar'],
      'Cafe': ['cafe'],
      'Hospital': ['hospital'],
      'Pharmacy': ['pharmacy'],
      'Gym': ['gym'],
      'Beauty Salon': ['beauty_salon'],
      'Spa': ['spa']
    };

    if (searchData.search_method === 'coordinates') {
      console.log('📍 Processing coordinates search...');
      
      // Parse coordinates
      const [lat, lng] = searchData.coordinates.split(',').map(coord => parseFloat(coord.trim()));
      const center = { lat, lng };
      console.log(`📍 Coordinates search: ${lat}, ${lng} with radius ${searchData.radius}m`);
      
      // Generate 9-point search strategy (EXACT LOCALHOST LOGIC!)
      const searchPoints = generateSearchPoints(center, searchData.radius);
      console.log(`🎯 Using 9-point search strategy with ${searchPoints.length} points`);
      
      let currentSearch = 0;
      let totalSearches = 0;
      
      // Calculate total searches (EXACT LOCALHOST LOGIC!)
      for (const category of searchData.categories) {
        const googleTypes = categoryMapping[category] || [category.toLowerCase()];
        totalSearches += searchPoints.length * googleTypes.length;
      }
      
      for (const [pointIndex, point] of searchPoints.entries()) {
        console.log(`📍 Searching point ${pointIndex + 1}/${searchPoints.length}: ${point.lat}, ${point.lng} (radius: ${point.radius}m)`);
        
        for (const category of searchData.categories) {
          const googleTypes = categoryMapping[category] || [category.toLowerCase()];
          
          for (const googleType of googleTypes) {
            currentSearch++;
            const progress = Math.floor((currentSearch / totalSearches) * 70); // 0-70% for searching
            
            // Update progress
            await supabase
              .from('search_history')
              .update({ 
                processed_count: currentSearch,
                total_results: totalSearches
              })
              .eq('id', searchId);
            
            console.log(`🔍 Point ${pointIndex + 1}/${searchPoints.length}, category: ${category} → ${googleType} (${progress}%)`);
            
            // EXACT Google Places API call (same as localhost)
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${point.lat},${point.lng}&radius=${point.radius}&type=${googleType}&key=${GOOGLE_API_KEY}`;
            
            try {
              const response = await fetch(url);
              const data = await response.json();
              
              console.log(`📊 Google API response for ${category}(${googleType}) at point ${pointIndex + 1}: Status=${data.status}, Results=${data.results?.length || 0}`);
              
              if (data.status === 'OK' && data.results && data.results.length > 0) {
                // Filter results based on category (EXACT LOCALHOST LOGIC!)
                let filteredResults = data.results;
                
                if (category === 'Hotel') {
                  // Filter for actual hotels only (exclude hostels, apartments, etc.)
                  filteredResults = data.results.filter((place: any) => {
                    const name = place.name?.toLowerCase() || '';
                    const types = place.types || [];
                    
                    // STRICT: Must have hotel-related keywords
                    const hotelKeywords = ['hotel', 'inn', 'resort', 'suite', 'palace', 'grand', 'royal', 'marriott', 'hilton', 'hyatt', 'premier inn', 'holiday inn', 'club quarters', 'citizenm', 'budget inn', 'clayton hotel', 'apex hotel', 'z hotel'];
                    const hasHotelKeyword = hotelKeywords.some(keyword => name.includes(keyword));
                    
                    // STRICT: Exclude non-hotel keywords
                    const excludeKeywords = ['hostel', 'apartment', 'apart', 'flat', 'room', 'yha', 'backpacker', 'b&b', 'bed and breakfast', 'pub', 'bar', 'lodge', 'grand lodge', 'masonic', 'tavern', 'restaurant', 'cafe', 'coffee', 'faucet', 'provincial', 'shaftesbury', 'thavies'];
                    const hasExcludeKeyword = excludeKeywords.some(keyword => name.includes(keyword));
                    
                    // Include if it's a proper hotel (has hotel keyword and no exclude keywords)
                    return hasHotelKeyword && !hasExcludeKeyword;
                  });
                  
                  console.log(`🔍 Filtered ${data.results.length} → ${filteredResults.length} actual hotels`);
                }
                
                if (filteredResults.length > 0) {
                  // Filter by actual distance from center point
                  const placesWithinRadius = filteredResults.filter((place: any) => {
                    if (!place.geometry?.location) return false;
                    
                    const placeLat = place.geometry.location.lat;
                    const placeLng = place.geometry.location.lng;
                    
                    // Calculate distance from center point
                    const distance = calculateDistance(center.lat, center.lng, placeLat, placeLng);
                    
                    // Only include if within the specified radius
                    return distance <= searchData.radius;
                  });
                  
                  console.log(`📏 Distance filter: ${filteredResults.length} → ${placesWithinRadius.length} within ${searchData.radius}m radius`);
                  
                  if (placesWithinRadius.length > 0) {
                    // Add the ORIGINAL category (not Google's generic type)
                    const placesWithCategory = placesWithinRadius.map((place: any) => ({
                      ...place,
                      category: category, // Use original category (Hotel, Aparthotel)
                      google_type: googleType,
                      search_point: pointIndex + 1
                    }));
                    
                    allPlaces.push(...placesWithCategory);
                  }
                  console.log(`✅ Found ${placesWithCategory.length} ${category} places at point ${pointIndex + 1}`);
                } else {
                  console.log(`⚠️ No ${category} results after filtering at point ${pointIndex + 1}`);
                }
              } else {
                console.log(`⚠️ No results for ${category}(${googleType}) at point ${pointIndex + 1}. Status: ${data.status}`);
              }
              
              // Rate limiting delay (same as localhost)
              await new Promise(resolve => setTimeout(resolve, 300));
              
            } catch (error) {
              console.error(`❌ Error searching point ${pointIndex + 1}, category ${category}:`, error);
            }
          }
        }
      }
    }

    // Remove duplicates (same as localhost!)
    const uniquePlaces = deduplicatePlaces(allPlaces);
    console.log(`🔄 Deduplicated: ${allPlaces.length} → ${uniquePlaces.length} unique places`);
    
    // Process each place and save to database (EXACT LOCALHOST LOGIC!)
    let processedCount = 0;
    
    for (const [index, place] of uniquePlaces.entries()) {
      const progress = 70 + Math.floor((index / uniquePlaces.length) * 25); // 70-95%
      
      await supabase
        .from('search_history')
        .update({ 
          processed_count: processedCount,
          total_results: uniquePlaces.length
        })
        .eq('id', searchId);
      
      console.log(`🏢 Processing place ${index + 1}/${uniquePlaces.length}: ${place.name} (${progress}%)`);
      
      try {
        // Get place details
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,geometry,address_components&key=${GOOGLE_API_KEY}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.result) {
          const placeDetails = detailsData.result;
          
          // Format for database (same as localhost!)
          const leadData = {
            external_id: `gmp_${place.place_id}`,
            name: placeDetails.name,
            phone: placeDetails.formatted_phone_number || null,
            website: placeDetails.website || null,
            address: placeDetails.formatted_address || null,
            city: extractCity(placeDetails.address_components) || searchData.city,
            country: extractCountry(placeDetails.address_components),
            business_type: place.category, // Use original category (Hotel, Aparthotel)
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
            source: 'Google Maps API'
          };

          // Save to database
          const { error: insertError } = await supabase
            .from('leads')
            .insert([leadData]);

          if (insertError) {
            console.error(`❌ Error saving lead ${place.name}:`, insertError);
          } else {
            processedCount++;
            console.log(`✅ Saved lead: ${place.name}`);
          }
        }

        // Small delay between processing
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing place ${place.name}:`, error);
      }
    }

    // Complete the extraction
    await supabase
      .from('search_history')
      .update({ 
        status: 'completed',
        total_results: processedCount,
        processed_count: processedCount,
        results: { summary: `Extracted ${processedCount} leads from ${uniquePlaces.length} places` }
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

// Helper functions (same as localhost!)
function generateSearchPoints(center: {lat: number, lng: number}, radius: number) {
  // Calculate offset based on radius (approximate)
  const latOffset = radius / 111000; // roughly 111km per degree latitude
  const lngOffset = radius / (111000 * Math.cos(center.lat * Math.PI / 180)); // adjust for longitude
  
  return [
    { lat: center.lat, lng: center.lng, radius }, // center
    { lat: center.lat + latOffset, lng: center.lng, radius }, // north
    { lat: center.lat - latOffset, lng: center.lng, radius }, // south
    { lat: center.lat, lng: center.lng + lngOffset, radius }, // east
    { lat: center.lat, lng: center.lng - lngOffset, radius }, // west
    { lat: center.lat + latOffset/2, lng: center.lng + lngOffset/2, radius }, // northeast
    { lat: center.lat + latOffset/2, lng: center.lng - lngOffset/2, radius }, // northwest
    { lat: center.lat - latOffset/2, lng: center.lng + lngOffset/2, radius }, // southeast
    { lat: center.lat - latOffset/2, lng: center.lng - lngOffset/2, radius }, // southwest
  ];
}

function deduplicatePlaces(places: any[]) {
  const seen = new Set();
  return places.filter(place => {
    if (seen.has(place.place_id)) {
      return false;
    }
    seen.add(place.place_id);
    return true;
  });
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
}

function extractCity(addressComponents: any[]) {
  const cityComponent = addressComponents?.find((comp: any) => 
    comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
  );
  return cityComponent?.long_name || null;
}

function extractCountry(addressComponents: any[]) {
  const countryComponent = addressComponents?.find((comp: any) => 
    comp.types.includes('country')
  );
  return countryComponent?.long_name || null;
}
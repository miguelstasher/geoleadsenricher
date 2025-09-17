import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchId, searchData } = await req.json()
    
    // Initialize Supabase client with service role (full access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`🚀 Starting Google Maps extraction for search ${searchId}`)

    // Update search status to processing
    await supabase
      .from('search_history')
      .update({ 
        status: 'in_process',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', searchId)

    const GOOGLE_API_KEY = 'AIzaSyCWLWBJJeNyMsV1ieKMQl53OJuzZLOYP-k'
    let allPlaces: any[] = []

    if (searchData.search_method === 'coordinates') {
      // Parse coordinates
      const [lat, lng] = searchData.coordinates.split(',').map((coord: string) => parseFloat(coord.trim()))
      const center = { lat, lng }
      
      console.log(`📍 Coordinates search: ${lat}, ${lng} with radius ${searchData.radius}m`)
      
      // Generate 9-point search strategy (same as localhost!)
      const searchPoints = generateSearchPoints(center, searchData.radius)
      
      let currentSearch = 0
      const totalSearches = searchPoints.length * searchData.categories.length
      
      for (const [pointIndex, point] of searchPoints.entries()) {
        for (const [categoryIndex, category] of searchData.categories.entries()) {
          currentSearch++
          const progress = Math.floor((currentSearch / totalSearches) * 70) // 0-70% for searching
          
          // Update progress
          await supabase
            .from('search_history')
            .update({ 
              processed_count: currentSearch,
              total_results: totalSearches
            })
            .eq('id', searchId)
          
          console.log(`🔍 Searching point ${pointIndex + 1}/${searchPoints.length}, category: ${category} (${progress}%)`)
          
          // Google Places API call
          const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${point.lat},${point.lng}&radius=${point.radius}&type=${category}&key=${GOOGLE_API_KEY}`
          
          try {
            const response = await fetch(url)
            const data = await response.json()
            
            if (data.results && data.results.length > 0) {
              // Add category to each place
              const placesWithCategory = data.results.map((place: any) => ({
                ...place,
                category: category
              }))
              allPlaces.push(...placesWithCategory)
              console.log(`✅ Found ${data.results.length} places for ${category} at point ${pointIndex + 1}`)
            }
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 200))
            
          } catch (error) {
            console.error(`❌ Error searching point ${pointIndex + 1}, category ${category}:`, error)
          }
        }
      }
    } else if (searchData.search_method === 'city') {
      // City-based search
      console.log(`🏙️ City search: ${searchData.city}, ${searchData.country}`)
      
      for (const [categoryIndex, category] of searchData.categories.entries()) {
        const progress = Math.floor((categoryIndex / searchData.categories.length) * 70)
        
        await supabase
          .from('search_history')
          .update({ 
            processed_count: categoryIndex + 1,
            total_results: searchData.categories.length
          })
          .eq('id', searchId)
        
        console.log(`🔍 Searching city for category: ${category} (${progress}%)`)
        
        // Use Google Places Text Search for city-based search
        const query = `${category} in ${searchData.city}, ${searchData.country}`
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`
        
        try {
          const response = await fetch(url)
          const data = await response.json()
          
          if (data.results && data.results.length > 0) {
            const placesWithCategory = data.results.map((place: any) => ({
              ...place,
              category: category
            }))
            allPlaces.push(...placesWithCategory)
            console.log(`✅ Found ${data.results.length} places for ${category} in ${searchData.city}`)
          }
          
          await new Promise(resolve => setTimeout(resolve, 500))
          
        } catch (error) {
          console.error(`❌ Error searching city for ${category}:`, error)
        }
      }
    }

    // Remove duplicates (same as localhost!)
    const uniquePlaces = deduplicatePlaces(allPlaces)
    console.log(`🔄 Deduplicated: ${allPlaces.length} → ${uniquePlaces.length} unique places`)
    
    // Process each place and save to database
    let processedCount = 0
    
    for (const [index, place] of uniquePlaces.entries()) {
      const progress = 70 + Math.floor((index / uniquePlaces.length) * 25) // 70-95%
      
      await supabase
        .from('search_history')
        .update({ 
          processed_count: processedCount,
          total_results: uniquePlaces.length
        })
        .eq('id', searchId)
      
      console.log(`🏢 Processing place ${index + 1}/${uniquePlaces.length}: ${place.name} (${progress}%)`)
      
      try {
        // Get place details
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,geometry,address_components&key=${GOOGLE_API_KEY}`
        
        const detailsResponse = await fetch(detailsUrl)
        const detailsData = await detailsResponse.json()
        
        if (detailsData.result) {
          const placeDetails = detailsData.result
          
          // Format for database (same as localhost!)
          const leadData = {
            external_id: `gmp_${place.place_id}`,
            name: placeDetails.name,
            phone: placeDetails.formatted_phone_number || null,
            website: placeDetails.website || null,
            address: placeDetails.formatted_address || null,
            city: extractCity(placeDetails.address_components) || searchData.city,
            country: extractCountry(placeDetails.address_components),
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
          }

          // Insert to leads table
          const { error: insertError } = await supabase
            .from('leads')
            .insert([leadData])

          if (!insertError) {
            processedCount++
            console.log(`✅ Saved lead: ${leadData.name}`)
          } else {
            console.error(`❌ Error saving lead ${leadData.name}:`, insertError)
          }
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Error processing place ${place.name}:`, error)
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
      .eq('id', searchId)

    console.log(`🎉 Extraction completed! Processed ${processedCount} leads`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        total_places: uniquePlaces.length,
        message: `Successfully extracted ${processedCount} leads`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Extraction error:', error)
    
    // Update search as failed
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { searchId } = await req.json().catch(() => ({}))
    if (searchId) {
      await supabase
        .from('search_history')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', searchId)
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Helper functions (same as localhost!)
function generateSearchPoints(center: {lat: number, lng: number}, radius: number) {
  // Calculate offset based on radius (approximate)
  const latOffset = radius / 111000 // roughly 111km per degree latitude
  const lngOffset = radius / (111000 * Math.cos(center.lat * Math.PI / 180)) // adjust for longitude
  
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
  ]
}

function deduplicatePlaces(places: any[]) {
  const seen = new Set()
  return places.filter(place => {
    if (seen.has(place.place_id)) {
      return false
    }
    seen.add(place.place_id)
    return true
  })
}

function extractCity(addressComponents: any[]) {
  const cityComponent = addressComponents?.find((comp: any) => 
    comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
  )
  return cityComponent?.long_name || null
}

function extractCountry(addressComponents: any[]) {
  const countryComponent = addressComponents?.find((comp: any) => 
    comp.types.includes('country')
  )
  return countryComponent?.long_name || null
}
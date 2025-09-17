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
    const { jobId, searchData } = await req.json()
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update job status
    await supabase
      .from('jobs')
      .update({ status: 'processing', progress: 10 })
      .eq('id', jobId)

    // Google Maps extraction (NO TIMEOUT LIMITS!)
    const googleApiKey = 'AIzaSyCWLWBJJeNyMsV1ieKMQl53OJuzZLOYP-k'
    let allPlaces = []

    if (searchData.search_method === 'coordinates') {
      // Parse coordinates
      const [lat, lng] = searchData.coordinates.split(',').map(coord => parseFloat(coord.trim()))
      
      // Perform 9-point search strategy (just like localhost!)
      const searchPoints = generateSearchPoints({ lat, lng }, searchData.radius)
      
      for (const [index, point] of searchPoints.entries()) {
        // Update progress
        const progress = 10 + (index / searchPoints.length) * 60 // 10-70%
        await supabase
          .from('jobs')
          .update({ 
            progress: Math.floor(progress),
            current_message: `Searching point ${index + 1}/${searchPoints.length}`
          })
          .eq('id', jobId)

        // Search each category at this point
        for (const category of searchData.categories) {
          const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${point.lat},${point.lng}&radius=${point.radius}&type=${category}&key=${googleApiKey}`
          
          const response = await fetch(url)
          const data = await response.json()
          
          if (data.results) {
            allPlaces.push(...data.results.map(place => ({ ...place, category })))
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    }

    // Remove duplicates
    const uniquePlaces = deduplicatePlaces(allPlaces)
    
    // Process each place and save to database
    let processedCount = 0
    
    for (const [index, place] of uniquePlaces.entries()) {
      // Update progress
      const progress = 70 + (index / uniquePlaces.length) * 25 // 70-95%
      await supabase
        .from('jobs')
        .update({ 
          progress: Math.floor(progress),
          current_message: `Processing place ${index + 1}/${uniquePlaces.length}: ${place.name}`
        })
        .eq('id', jobId)

      try {
        // Get place details
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,geometry,address_components&key=${googleApiKey}`
        
        const detailsResponse = await fetch(detailsUrl)
        const detailsData = await detailsResponse.json()
        
        if (detailsData.result) {
          const placeDetails = detailsData.result
          
          // Format for database (same as localhost!)
          const leadData = {
            external_id: place.place_id,
            name: placeDetails.name,
            phone: placeDetails.formatted_phone_number || null,
            website: placeDetails.website || null,
            address: placeDetails.formatted_address || null,
            city: extractCity(placeDetails.address_components),
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
          }
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error('Error processing place:', error)
      }
    }

    // Complete the job
    await supabase
      .from('jobs')
      .update({ 
        status: 'completed',
        progress: 100,
        current_message: `Completed! Processed ${processedCount} leads`,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Update search history
    if (searchData.searchId) {
      await supabase
        .from('search_history')
        .update({ 
          status: 'completed',
          total_results: processedCount,
          processed_count: processedCount
        })
        .eq('id', searchData.searchId)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        message: 'Google Maps extraction completed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Extraction error:', error)
    return new Response(
      JSON.stringify({ error: 'Extraction failed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Helper functions (same as localhost!)
function generateSearchPoints(center: {lat: number, lng: number}, radius: number) {
  // 9-point search strategy
  const points = []
  const offsets = [
    { lat: 0, lng: 0 }, // center
    { lat: 0.003, lng: 0 }, // north
    { lat: -0.003, lng: 0 }, // south  
    { lat: 0, lng: 0.003 }, // east
    { lat: 0, lng: -0.003 }, // west
    { lat: 0.002, lng: 0.002 }, // northeast
    { lat: 0.002, lng: -0.002 }, // northwest
    { lat: -0.002, lng: 0.002 }, // southeast
    { lat: -0.002, lng: -0.002 } // southwest
  ]
  
  for (const offset of offsets) {
    points.push({
      lat: center.lat + offset.lat,
      lng: center.lng + offset.lng,
      radius: radius
    })
  }
  
  return points
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
  const cityComponent = addressComponents?.find(comp => 
    comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
  )
  return cityComponent?.long_name || null
}

function extractCountry(addressComponents: any[]) {
  const countryComponent = addressComponents?.find(comp => 
    comp.types.includes('country')
  )
  return countryComponent?.long_name || null
}

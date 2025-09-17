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
    const { leadIds, platform } = await req.json()
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`🔍 Starting ${platform} enrichment for ${leadIds.length} leads`)

    // SerpAPI key (same as your existing one)
    const SERP_API_KEY = '3e12634045d6b5edd5cf314df831aaadebd1d7c5c4c5e4114ef3b4be35a75de8'

    let processedCount = 0
    let enrichedCount = 0

    for (const [index, leadId] of leadIds.entries()) {
      const progress = Math.floor((index / leadIds.length) * 100)
      console.log(`🔗 Processing lead ${index + 1}/${leadIds.length} for ${platform} (${progress}%)`)

      try {
        // Get lead data
        const { data: lead, error: fetchError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single()

        if (fetchError || !lead) {
          console.error(`❌ Error fetching lead ${leadId}:`, fetchError)
          continue
        }

        // Skip if no business name
        if (!lead.name || lead.name.trim() === '') {
          console.log(`⏭️ Lead ${leadId} has no business name, skipping ${platform} enrichment`)
          processedCount++
          continue
        }

        // Check if already has URL for this platform
        const urlField = platform === 'linkedin' ? 'linkedin_url' : 'facebook_url'
        if (lead[urlField] && lead[urlField].trim() !== '') {
          console.log(`⏭️ Lead ${lead.name} already has ${platform} URL: ${lead[urlField]}`)
          processedCount++
          continue
        }

        console.log(`🔍 Searching ${platform} URL for: ${lead.name}`)

        let foundUrl = null

        if (platform === 'linkedin') {
          foundUrl = await searchLinkedInProfile(lead.name, SERP_API_KEY)
        } else if (platform === 'facebook') {
          foundUrl = await searchFacebookPage(lead.name, SERP_API_KEY)
        }

        // Update lead with results
        if (foundUrl) {
          const updateData = {
            [urlField]: foundUrl,
            last_modified: new Date().toISOString()
          }

          const { error: updateError } = await supabase
            .from('leads')
            .update(updateData)
            .eq('id', leadId)

          if (!updateError) {
            enrichedCount++
            console.log(`✅ Updated ${lead.name} with ${platform} URL: ${foundUrl}`)
          } else {
            console.error(`❌ Error updating lead:`, updateError)
          }
        } else {
          console.log(`❌ No ${platform} URL found for ${lead.name}`)
        }

        processedCount++

        // Delay to avoid rate limits (SerpAPI has limits)
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Error processing lead ${leadId}:`, error)
        processedCount++
      }
    }

    console.log(`🎉 ${platform} enrichment completed! Processed ${processedCount} leads, found ${enrichedCount} URLs`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        enriched: enrichedCount,
        platform: platform,
        message: `Successfully found ${enrichedCount} ${platform} URLs out of ${processedCount} leads`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error(`❌ Social media enrichment error:`, error)
    return new Response(
      JSON.stringify({ 
        error: 'Social media enrichment failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function searchLinkedInProfile(businessName: string, apiKey: string): Promise<string | null> {
  try {
    // Convert "Roisa Hostal Boutique" to "Roisa+Hostal+Boutique+General+Manager+Linkedin"
    const cleanName = businessName
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, '+') // Replace spaces with +
    
    const searchQuery = `${cleanName}+General+Manager+Linkedin`
    const fullQuery = `${searchQuery} site:linkedin.com/in/ OR site:linkedin.com/pub/`
    const encodedQuery = encodeURIComponent(fullQuery)
    
    const apiUrl = `https://serpapi.com/search.json?api_key=${apiKey}&q=${encodedQuery}&num=10&gl=uk`
    
    console.log(`  🔍 LinkedIn Search Query: ${fullQuery}`)
    
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    // Find the first LinkedIn profile URL
    const firstResultUrl = data.organic_results && data.organic_results.length > 0 
      ? data.organic_results[0].link 
      : null
    
    console.log(`  📋 LinkedIn Search Result: ${firstResultUrl}`)
    
    return firstResultUrl
    
  } catch (error) {
    console.error(`❌ Error searching LinkedIn profile for ${businessName}:`, error)
    return null
  }
}

async function searchFacebookPage(businessName: string, apiKey: string): Promise<string | null> {
  try {
    // Convert "Roisa Hostal Boutique" to "Roisa+Hostal+Boutique+Facebook"
    const cleanName = businessName
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, '+') // Replace spaces with +
    
    const searchQuery = `${cleanName}+Facebook`
    const encodedQuery = encodeURIComponent(searchQuery)
    
    const apiUrl = `https://serpapi.com/search.json?api_key=${apiKey}&q=${encodedQuery}&num=10&gl=us`
    
    console.log(`  🔍 Facebook Search Query: ${searchQuery}`)
    
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    // Find the first Facebook URL
    let facebookUrl = null
    if (data.organic_results) {
      for (const item of data.organic_results) {
        if (isFacebookUrl(item.link)) {
          facebookUrl = item.link
          break
        }
      }
    }
    
    console.log(`  📋 Facebook Search Result: ${facebookUrl}`)
    
    return facebookUrl
    
  } catch (error) {
    console.error(`❌ Error searching Facebook page for ${businessName}:`, error)
    return null
  }
}

function isFacebookUrl(url: string): boolean {
  return url.includes('facebook.com/') && 
         !url.includes('facebook.com/search') && 
         !url.includes('facebook.com/login') &&
         !url.includes('facebook.com/terms')
}

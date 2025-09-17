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
    const { leadIds } = await req.json()
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`🔍 Starting email enrichment for ${leadIds.length} leads`)

    // API Keys (you'll set these in Supabase dashboard)
    const HUNTER_API_KEY = Deno.env.get('HUNTER_API_KEY') || 'd5872c0d46ca867af0f53d823247c3be37b5446a'
    const SNOV_USER_ID = Deno.env.get('SNOV_USER_ID') || '9d6ecb9c93134a23a9fd4a052072783c'
    const SNOV_SECRET = Deno.env.get('SNOV_SECRET') || '45aeaed702300aca97ff732a14e53132'
    const AWS_LAMBDA_URL = Deno.env.get('AWS_LAMBDA_URL') || 'https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper'

    let processedCount = 0
    let enrichedCount = 0

    for (const [index, leadId] of leadIds.entries()) {
      const progress = Math.floor((index / leadIds.length) * 100)
      console.log(`📧 Processing lead ${index + 1}/${leadIds.length} (${progress}%)`)

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

        // Skip if already has email or no website
        if (lead.email && lead.email !== 'not_found' && lead.email !== '') {
          console.log(`⏭️ Lead ${lead.name} already has email: ${lead.email}`)
          processedCount++
          continue
        }

        if (!lead.website || lead.website.trim() === '') {
          console.log(`⏭️ Lead ${lead.name} has no website, skipping email enrichment`)
          processedCount++
          continue
        }

        console.log(`🔍 Enriching email for: ${lead.name} (${lead.website})`)

        let emailResult = null

        // Step 1: Try AWS Lambda scraper first (most reliable)
        try {
          console.log(`  📡 Step 1: Trying AWS Lambda scraper...`)
          
          const lambdaPayload = {
            website: lead.website,
            business_name: lead.name
          }

          const lambdaResponse = await fetch(AWS_LAMBDA_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer b24be261-f07b-4adf-a33c-cf87084b889b'
            },
            body: JSON.stringify(lambdaPayload)
          })

          if (lambdaResponse.ok) {
            const lambdaData = await lambdaResponse.json()
            if (lambdaData.email && lambdaData.email !== 'not_found' && lambdaData.email !== 'No email found') {
              console.log(`  ✅ AWS Lambda found: ${lambdaData.email}`)
              emailResult = {
                email: lambdaData.email,
                email_status: 'Valid', // Lambda results are usually good
                source: 'aws_lambda'
              }
            }
          }
        } catch (error) {
          console.log(`  ⚠️ AWS Lambda failed:`, error)
        }

        // Step 2: Try Hunter.io if Lambda failed
        if (!emailResult) {
          try {
            console.log(`  📡 Step 2: Trying Hunter.io...`)
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds between APIs

            const domain = extractDomain(lead.website)
            const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}`
            
            const hunterResponse = await fetch(hunterUrl)
            const hunterData = await hunterResponse.json()
            
            if (hunterData.data?.emails && hunterData.data.emails.length > 0) {
              const email = hunterData.data.emails[0].value
              console.log(`  ✅ Hunter.io found: ${email}`)
              
              // Verify the email with Hunter.io
              const verifyUrl = `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${HUNTER_API_KEY}`
              const verifyResponse = await fetch(verifyUrl)
              const verifyData = await verifyResponse.json()
              
              const score = verifyData.data?.score || 0
              const status = score >= 80 ? 'Valid' : score >= 50 ? 'Unverified' : 'Invalid'
              
              emailResult = {
                email: email,
                email_status: status,
                source: 'hunter.io',
                confidence_score: score
              }
            }
          } catch (error) {
            console.log(`  ⚠️ Hunter.io failed:`, error)
          }
        }

        // Step 3: Try Snov.io if Hunter failed
        if (!emailResult) {
          try {
            console.log(`  📡 Step 3: Trying Snov.io...`)
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds between APIs

            const domain = extractDomain(lead.website)
            const snovUrl = `https://api.snov.io/v1/get-domain-emails-with-info?domain=${domain}&type=all&limit=10&access_token=${SNOV_SECRET}`
            
            const snovResponse = await fetch(snovUrl)
            const snovData = await snovResponse.json()
            
            if (snovData.emails && snovData.emails.length > 0) {
              const email = snovData.emails[0].email
              console.log(`  ✅ Snov.io found: ${email}`)
              
              emailResult = {
                email: email,
                email_status: 'Unverified', // Snov results need verification
                source: 'snov.io'
              }
            }
          } catch (error) {
            console.log(`  ⚠️ Snov.io failed:`, error)
          }
        }

        // Update lead with results
        if (emailResult) {
          const { error: updateError } = await supabase
            .from('leads')
            .update({
              email: emailResult.email,
              email_status: emailResult.email_status,
              last_modified: new Date().toISOString()
            })
            .eq('id', leadId)

          if (!updateError) {
            enrichedCount++
            console.log(`✅ Updated ${lead.name} with email: ${emailResult.email} (${emailResult.email_status})`)
          } else {
            console.error(`❌ Error updating lead:`, updateError)
          }
        } else {
          // Mark as not found
          await supabase
            .from('leads')
            .update({
              email: 'not_found',
              email_status: 'not_found',
              last_modified: new Date().toISOString()
            })
            .eq('id', leadId)
          
          console.log(`❌ No email found for ${lead.name}`)
        }

        processedCount++

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Error processing lead ${leadId}:`, error)
        processedCount++
      }
    }

    console.log(`🎉 Email enrichment completed! Processed ${processedCount} leads, enriched ${enrichedCount}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        enriched: enrichedCount,
        message: `Successfully enriched ${enrichedCount} out of ${processedCount} leads`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Email enrichment error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Email enrichment failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function extractDomain(website: string): string {
  try {
    const url = website.startsWith('http') ? website : `https://${website}`
    const hostname = new URL(url).hostname
    return hostname.replace('www.', '')
  } catch (error) {
    return website.replace(/https?:\/\//, '').replace('www.', '').split('/')[0]
  }
}

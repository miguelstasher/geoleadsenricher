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
    const { leadIds, campaignId, campaignName } = await req.json()
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`🚀 Starting campaign upload for ${leadIds.length} leads to campaign: ${campaignName}`)

    // Your existing AWS Lambda URL for campaign uploads
    const LAMBDA_API_URL = 'https://j28mhgjbo3.execute-api.eu-north-1.amazonaws.com/prod'

    // Get leads from database
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select(`
        id, 
        name, 
        email, 
        city, 
        business_type, 
        poi, 
        currency,
        email_status
      `)
      .in('id', leadIds)
      .not('email', 'is', null)
      .neq('email', '')
      .neq('email', 'Not Found')
      .neq('email', 'not_found')
      .neq('email_status', 'Invalid')

    if (fetchError) {
      console.error('❌ Error fetching leads:', fetchError)
      throw new Error('Failed to fetch leads from database')
    }

    if (!leads || leads.length === 0) {
      console.log('⚠️ No valid leads found with verified emails')
      return new Response(
        JSON.stringify({ 
          error: 'No valid leads found with verified emails',
          details: 'Selected leads must have valid email addresses to be uploaded to campaigns'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log(`📧 Found ${leads.length} leads with valid emails for upload`)

    // Format leads for Lambda API (same format as your existing system)
    const formattedLeads = leads.map(lead => ({
      email1: lead.email,
      Name: lead.name,
      Campaign_id: campaignId,
      City: lead.city,
      BusinessType: lead.business_type,
      ContactFirstName: null, // We don't have separate first/last names
      ContactLastName: null,
      Currency: lead.currency,
      Point_of_interest: lead.poi
    }))

    console.log(`📋 Formatted ${formattedLeads.length} leads for Lambda upload`)

    // Send to Lambda API in batches (same as your existing system)
    const BATCH_SIZE = 500
    let totalUploaded = 0
    let totalSkipped = 0
    let allResults = []

    for (let i = 0; i < formattedLeads.length; i += BATCH_SIZE) {
      const batch = formattedLeads.slice(i, i + BATCH_SIZE)
      console.log(`📤 Sending batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(formattedLeads.length / BATCH_SIZE)} (${batch.length} leads)`)

      try {
        const response = await fetch(LAMBDA_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batch)
        })

        if (!response.ok) {
          throw new Error(`Lambda API returned ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} response:`, JSON.stringify(result, null, 2))

        // Check if the response contains Cloudflare challenge
        if (result.results && result.results.length > 0) {
          for (const campaignResult of result.results) {
            if (typeof campaignResult.response === 'string' && campaignResult.response.includes('Cloudflare')) {
              console.error('⚠️ Cloudflare challenge detected in Lambda response')
              throw new Error('Lambda API is being blocked by Cloudflare protection')
            }
          }
        }

        if (result.message !== 'Success') {
          throw new Error(`Lambda returned unexpected response: ${result.message}`)
        }

        allResults.push(...result.results)

      } catch (error) {
        console.error(`❌ Error uploading batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error)
        throw error
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Process results and update lead statuses
    const updatePromises = []
    let successfullyUploadedCount = 0

    // Extract uploaded and skipped emails from Lambda results
    const uploadedEmails = []
    const skippedEmails = []

    for (const campaignResult of allResults) {
      if (campaignResult.response && typeof campaignResult.response === 'object') {
        const response = campaignResult.response
        
        // Count uploaded leads
        if (response.leads_uploaded) {
          successfullyUploadedCount += response.leads_uploaded
        }
        
        // If Lambda provides specific email lists, use them
        if (response.uploaded_emails) {
          uploadedEmails.push(...response.uploaded_emails)
        }
        if (response.skipped_emails) {
          skippedEmails.push(...response.skipped_emails)
        }
      }
    }

    // Update leads based on their determined status
    for (const lead of leads) {
      const leadEmail = lead.email
      
      if (uploadedEmails.includes(leadEmail) || (uploadedEmails.length === 0 && successfullyUploadedCount > 0)) {
        // Lead was successfully uploaded (or we assume success if no specific email lists)
        updatePromises.push(
          supabase
            .from('leads')
            .update({
              campaign: campaignName,
              campaign_status: 'sent',
              upload_status: 'uploaded',
              last_modified: new Date().toISOString()
            })
            .eq('id', lead.id)
        )
      } else if (skippedEmails.includes(leadEmail)) {
        // Lead was skipped (duplicate, blocklisted, invalid, etc.)
        updatePromises.push(
          supabase
            .from('leads')
            .update({
              campaign: campaignName,
              campaign_status: 'new',
              upload_status: 'skipped',
              last_modified: new Date().toISOString()
            })
            .eq('id', lead.id)
        )
      } else {
        // Lead was not processed by Lambda (error, etc.)
        updatePromises.push(
          supabase
            .from('leads')
            .update({
              campaign: campaignName,
              campaign_status: 'new',
              upload_status: 'not_processed',
              last_modified: new Date().toISOString()
            })
            .eq('id', lead.id)
        )
      }
    }

    // Execute all database updates
    console.log(`📝 Updating ${updatePromises.length} lead statuses in database...`)
    await Promise.all(updatePromises)

    console.log(`🎉 Campaign upload completed!`)
    console.log(`📊 Results: ${successfullyUploadedCount} uploaded, ${leads.length - successfullyUploadedCount} skipped/failed`)

    return new Response(
      JSON.stringify({ 
        success: true,
        campaignName: campaignName,
        totalLeads: leadIds.length,
        validLeads: leads.length,
        uploadedLeads: successfullyUploadedCount,
        skippedLeads: leads.length - successfullyUploadedCount,
        message: `Successfully uploaded ${successfullyUploadedCount} leads to campaign "${campaignName}"`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Campaign upload error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Campaign upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

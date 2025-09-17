import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LAMBDA_API_URL = 'https://j28mhgjbo3.execute-api.eu-north-1.amazonaws.com/prod';
const BATCH_SIZE = 100; // Process leads in batches of 100

interface UploadLeadData {
  email1: string;
  Name: string;
  Campaign_id: string;
  City: string | null;
  BusinessType: string | null;
  ContactFirstName: string | null;
  ContactLastName: string | null;
  Currency: string | null;
  Point_of_interest: string | null;
}

interface LambdaResponse {
  message: string;
  results: {
    campaign_id: string;
    response: {
      status?: string;
      error?: string;
      total_sent?: number;
      leads_uploaded?: number;
      in_blocklist?: number;
      skipped_count?: number;
      invalid_email_count?: number;
      duplicate_email_count?: number;
    } | string; // Allow string for error responses like Cloudflare challenges
    leads_count: number;
  }[];
  processedRecords: string[];
}

async function sendLeadsToLambda(leads: UploadLeadData[]): Promise<LambdaResponse> {
  const BATCH_SIZE = 500;
  const results: LambdaResponse['results'] = [];
  let allProcessedRecords: string[] = [];

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    console.log(`Sending batch of ${batch.length} leads to Lambda...`);

    const response = await fetch(LAMBDA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batch)
    });

    if (!response.ok) {
      throw new Error(`Lambda API returned ${response.status}: ${response.statusText}`);
    }

    const result: LambdaResponse = await response.json();
    console.log('Lambda Response:', JSON.stringify(result));

    // Check if the response contains Cloudflare challenge
    if (result.results && result.results.length > 0) {
      for (const campaignResult of result.results) {
        if (typeof campaignResult.response === 'string' && campaignResult.response.includes('Cloudflare')) {
          console.error('⚠️ Cloudflare challenge detected in Lambda response');
          console.error('Campaign ID:', campaignResult.campaign_id);
          console.error('This indicates the Lambda function is being blocked by Cloudflare');
          throw new Error('Lambda API is being blocked by Cloudflare protection');
        }
      }
    }

    if (result.message !== 'Success') {
      throw new Error(`Lambda returned unexpected response: ${result.message}`);
    }

    results.push(...result.results);
    allProcessedRecords.push(...(result.processedRecords || []));
  }

  return {
    message: 'Success',
    results,
    processedRecords: allProcessedRecords
  };
}

export async function POST(request: NextRequest) {
  try {
    const { leadIds, campaignId, campaignName } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Lead IDs are required' }, { status: 400 });
    }

    if (!campaignId || !campaignName) {
      return NextResponse.json({ error: 'Campaign ID and name are required' }, { status: 400 });
    }

    console.log(`Starting campaign upload for ${leadIds.length} leads to campaign: ${campaignName}`);

    // Fetch leads from Supabase
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select(`
        id, 
        name, 
        email, 
        city, 
        business_type, 
        poi, 
        currency
      `)
      .in('id', leadIds)
      .not('email', 'is', null)
      .neq('email', '')
      .neq('email', 'Not Found')
      .neq('email_status', 'invalid');

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ 
        error: 'No valid leads found with verified emails',
        details: 'Selected leads must have valid email addresses to be uploaded to campaigns'
      }, { status: 400 });
    }

    // Format leads for Lambda API
    const formattedLeads: UploadLeadData[] = leads.map(lead => ({
      email1: lead.email,
      Name: lead.name,
      Campaign_id: campaignId,
      City: lead.city,
      BusinessType: lead.business_type,
      ContactFirstName: null, // We don't have separate first/last names
      ContactLastName: null,
      Currency: lead.currency,
      Point_of_interest: lead.poi
    }));

    console.log(`Formatted ${formattedLeads.length} leads for upload`);

    // Send to Lambda API
    const lambdaResult = await sendLeadsToLambda(formattedLeads);

    // Update lead statuses in Supabase based on results
    const updatePromises = [];
    let successfullyUploadedCount = 0;
    let totalProcessedCount = 0;
    
    // Create a map of processed records from Lambda response
    const processedRecords = new Set(lambdaResult.processedRecords || []);
    
    console.log('Lambda processed records:', processedRecords);
    console.log('Total leads sent to Lambda:', leads.length);
    console.log('Lambda results:', JSON.stringify(lambdaResult.results, null, 2));
    
    for (const result of lambdaResult.results) {
      if (result.campaign_id === campaignId) {
        const response = result.response;
        
        if (typeof response === 'object' && response.status === 'success') {
          totalProcessedCount += result.leads_count;
          
          console.log(`Campaign ${campaignId} results:`, {
            leads_uploaded: response.leads_uploaded,
            skipped_count: response.skipped_count,
            duplicate_email_count: response.duplicate_email_count,
            in_blocklist: response.in_blocklist,
            invalid_email_count: response.invalid_email_count,
            total_sent: response.total_sent
          });
          
          // Improved logic: Use Lambda response counts to determine accurate upload status
          // We'll distribute the statuses based on the actual counts from Lambda
          
          const totalProcessed = response.total_sent || 0;
          const totalUploaded = response.leads_uploaded || 0;
          const totalSkipped = (response.skipped_count || 0) + (response.duplicate_email_count || 0) + (response.in_blocklist || 0) + (response.invalid_email_count || 0);
          
          console.log(`Lambda Response Analysis:`, {
            totalProcessed,
            totalUploaded,
            totalSkipped,
            leadsProcessedByLambda: processedRecords.size
          });
          
          // Create arrays to track which leads get which status
          const processedEmails = Array.from(processedRecords);
          const uploadedEmails: string[] = [];
          const skippedEmails: string[] = [];
          
          // Distribute statuses based on actual Lambda counts
          if (totalUploaded > 0 && totalSkipped > 0) {
            // Both uploaded and skipped - distribute proportionally
            const uploadRatio = totalUploaded / (totalUploaded + totalSkipped);
            const uploadCount = Math.floor(processedEmails.length * uploadRatio);
            
            uploadedEmails.push(...processedEmails.slice(0, uploadCount));
            skippedEmails.push(...processedEmails.slice(uploadCount));
          } else if (totalUploaded > 0) {
            // All processed leads were uploaded
            uploadedEmails.push(...processedEmails);
          } else if (totalSkipped > 0) {
            // All processed leads were skipped
            skippedEmails.push(...processedEmails);
          }
          
          // Update leads based on their determined status
          for (const lead of leads) {
            const leadEmail = lead.email;
            
            if (uploadedEmails.includes(leadEmail)) {
              // Lead was successfully uploaded
              updatePromises.push(
                supabase
                  .from('leads')
                  .update({
                    campaign: campaignName,
                    campaign_status: 'sent',
                    upload_status: 'uploaded',
                    last_modified: new Date().toISOString().slice(0, 16).replace('T', ' ')
                  })
                  .eq('id', lead.id)
              );
              successfullyUploadedCount++;
            } else if (skippedEmails.includes(leadEmail)) {
              // Lead was skipped (duplicate, blocklisted, invalid, etc.)
              updatePromises.push(
                supabase
                  .from('leads')
                  .update({
                    campaign: campaignName,
                    campaign_status: 'new',
                    upload_status: 'skipped',
                    last_modified: new Date().toISOString().slice(0, 16).replace('T', ' ')
                  })
                  .eq('id', lead.id)
              );
            } else {
              // Lead was not processed by Lambda (error, etc.)
              updatePromises.push(
                supabase
                  .from('leads')
                  .update({
                    campaign: campaignName,
                    campaign_status: 'new',
                    upload_status: 'not_processed',
                    last_modified: new Date().toISOString().slice(0, 16).replace('T', ' ')
                  })
                  .eq('id', lead.id)
              );
            }
          }
        }
      }
    }

    // Execute all updates
    await Promise.all(updatePromises);

    console.log(`Successfully processed campaign upload for ${leadIds.length} leads`);
    console.log(`Actually uploaded: ${successfullyUploadedCount} leads`);

    // Calculate summary statistics
    const summary = {
      totalLeadsSelected: leadIds.length,
      validLeadsWithEmails: leads.length,
      leadsProcessedByLambda: processedRecords.size,
      leadsNotProcessedByLambda: leads.length - processedRecords.size,
      leadsUploaded: successfullyUploadedCount,
      leadsSkipped: Math.max(0, processedRecords.size - successfullyUploadedCount)
    };

    console.log('Upload Summary:', summary);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${leadIds.length} leads for campaign upload`,
      summary,
      details: {
        totalLeads: leadIds.length,
        validLeads: leads.length,
        leadsUploaded: successfullyUploadedCount,
        leadsSkipped: Math.max(0, processedRecords.size - successfullyUploadedCount),
        lambdaResults: lambdaResult.results,
        processedRecords: Array.from(processedRecords),
        notes: [
          "Upload statuses are determined based on Lambda response counts.",
          "Leads marked as 'uploaded' were successfully uploaded to the campaign.",
          "Leads marked as 'skipped' were not uploaded (duplicates, blocklisted, invalid emails, etc.).",
          "Leads marked as 'not_processed' were not processed by Lambda due to errors.",
          "To re-upload skipped leads, filter by 'Skipped' status and use the re-upload feature."
        ]
      }
    });

  } catch (error: any) {
    console.error('Error in campaign upload:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload leads to campaign',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 
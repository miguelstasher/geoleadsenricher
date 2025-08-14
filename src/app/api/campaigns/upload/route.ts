import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LAMBDA_API_URL = 'https://j28mhgjbo3.execute-api.eu-north-1.amazonaws.com/prod';

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
    
    for (const result of lambdaResult.results) {
      if (result.campaign_id === campaignId) {
        const response = result.response;
        
        if (typeof response === 'object' && response.status === 'success') {
          // Update leads that were successfully processed
          const leadsToUpdate = leads.slice(0, result.leads_count);
          
          for (const lead of leadsToUpdate) {
            updatePromises.push(
              supabase
                .from('leads')
                .update({
                  campaign: campaignName,
                  campaign_status: 'sent',
                  last_modified: new Date().toISOString().slice(0, 16).replace('T', ' ')
                })
                .eq('id', lead.id)
            );
          }
        }
      }
    }

    // Execute all updates
    await Promise.all(updatePromises);

    console.log(`Successfully processed campaign upload for ${leadIds.length} leads`);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${leadIds.length} leads for campaign upload`,
      totalLeads: leadIds.length,
      validLeads: leads.length,
      lambdaResults: lambdaResult.results,
      processedRecords: lambdaResult.processedRecords
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
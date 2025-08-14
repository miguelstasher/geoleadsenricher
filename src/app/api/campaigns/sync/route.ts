import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface InstantlyCampaign {
  id: string;
  name: string;
}

interface NewCampaignRecord {
  name: string;
  instantly_id: string;
  status: string;
  created_at: string;
}

interface CampaignUpdate {
  id: string;
  status: string;
}

// Function to fetch campaigns from Instantly API with retry logic
async function fetchInstantlyCampaignsWithRetry(skip: number, limit: number, maxRetries: number = 3): Promise<InstantlyCampaign[] | null> {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`Attempt ${retryCount + 1} to fetch campaigns batch starting at ${skip}...`);
      
      const response = await fetch(`https://api.instantly.ai/api/v1/campaign/list?api_key=${process.env.INSTANTLY_API_KEY}&skip=${skip}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 408 && retryCount < maxRetries - 1) {
          console.log(`Request timeout, retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          retryCount++;
          continue;
        }
        
        console.error(`Error fetching Instantly campaigns: ${response.status} ${response.statusText}`);
        const errorBody = await response.text();
        console.error(`Error details: ${errorBody}`);
        return null;
      }

      const campaigns = await response.json();
      if (!Array.isArray(campaigns)) {
        console.error(`Unexpected response format: ${JSON.stringify(campaigns)}`);
        return null;
      }

      return campaigns;
    } catch (error: any) {
      if (retryCount < maxRetries - 1) {
        console.log(`Error occurred, retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        retryCount++;
        continue;
      }
      console.error(`Error after ${maxRetries} retries: ${error.message}`);
      return null;
    }
  }
  
  // Fallback return in case the while loop exits without returning
  return null;
}

// Function to fetch all campaigns from Instantly API
async function fetchAllInstantlyCampaigns(): Promise<InstantlyCampaign[]> {
  const allCampaigns: InstantlyCampaign[] = [];
  let skip = 0;
  const limit = 100; // Maximum limit as per API documentation

  while (true) {
    const campaigns = await fetchInstantlyCampaignsWithRetry(skip, limit);
    
    if (campaigns === null) {
      console.log('Failed to fetch campaigns after retries');
      return [];
    }

    console.log(`Fetched ${campaigns.length} campaigns in this batch`);
    
    if (campaigns.length === 0) {
      break; // Exit loop if no more campaigns are returned
    }

    allCampaigns.push(...campaigns);
    skip += limit; // Increment skip for the next batch
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`Total campaigns fetched: ${allCampaigns.length}`);
  return allCampaigns;
}

export async function POST() {
  try {
    // Check if INSTANTLY_API_KEY is configured
    if (!process.env.INSTANTLY_API_KEY) {
      return NextResponse.json(
        { error: 'Instantly API key not configured' },
        { status: 500 }
      );
    }

    console.log('Starting campaign sync from Instantly...');

    // Fetch all campaigns from Instantly
    const instantlyCampaigns = await fetchAllInstantlyCampaigns();
    if (instantlyCampaigns.length === 0) {
      console.log('No campaigns were fetched from Instantly. Please check the API key and try again later.');
      return NextResponse.json({
        success: false,
        message: 'No campaigns found in Instantly',
        stats: { added: 0, updated: 0, deleted: 0 }
      });
    }

    console.log(`Fetched ${instantlyCampaigns.length} campaigns from Instantly.`);

    // Log all campaign IDs for debugging
    console.log('Instantly Campaign IDs:');
    instantlyCampaigns.forEach(campaign => {
      console.log(`- ${campaign.id}: ${campaign.name}`);
    });

    // Fetch existing campaigns from Supabase
    const { data: existingCampaigns, error: fetchError } = await supabase
      .from('campaigns')
      .select('*');

    if (fetchError) {
      console.error('Error fetching existing campaigns from Supabase:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch existing campaigns' },
        { status: 500 }
      );
    }

    const existingCampaignMap: { [key: string]: any } = {};
    existingCampaigns?.forEach(record => {
      existingCampaignMap[record.instantly_id] = record;
    });

    console.log(`Fetched ${existingCampaigns?.length || 0} existing campaigns from Supabase.`);

    // Log all existing campaign IDs for debugging
    console.log('Existing Supabase Campaign IDs:');
    for (const id in existingCampaignMap) {
      console.log(`- ${id}: ${existingCampaignMap[id].name} (Status: ${existingCampaignMap[id].status})`);
    }

    // Prepare updates for Supabase
    const newRecords: NewCampaignRecord[] = [];
    const updates: CampaignUpdate[] = [];
    const idsInInstantly = new Set();

    // First, add all Instantly campaign IDs to the set
    instantlyCampaigns.forEach(campaign => {
      idsInInstantly.add(campaign.id);
      if (!existingCampaignMap[campaign.id]) {
        // New campaign, add as Live
        newRecords.push({
          name: campaign.name,
          instantly_id: campaign.id,
          status: 'Live',
          created_at: new Date().toISOString()
        });
      } else if (existingCampaignMap[campaign.id].status === 'Deleted') {
        // Campaign exists but is marked as Deleted, update to Live
        updates.push({
          id: existingCampaignMap[campaign.id].id,
          status: 'Live'
        });
      }
    });

    console.log(`Identified ${newRecords.length} new campaigns to add as Live.`);
    console.log(`Identified ${updates.length} campaigns to mark as Live.`);

    // Mark campaigns as Deleted if they are not in the Instantly response
    for (const id in existingCampaignMap) {
      if (!idsInInstantly.has(id) && existingCampaignMap[id].status === 'Live') {
        updates.push({
          id: existingCampaignMap[id].id,
          status: 'Deleted'
        });
        console.log(`Will mark as deleted: ${id} (${existingCampaignMap[id].name})`);
      }
    }

    console.log(`Total campaigns to update: ${updates.length}`);

    let addedCount = 0;
    let updatedCount = 0;

    // Batch create new records in Supabase
    if (newRecords.length > 0) {
      const { data: insertedData, error: insertError } = await supabase
        .from('campaigns')
        .insert(newRecords)
        .select();

      if (insertError) {
        console.error('Error creating new campaigns in Supabase:', insertError);
        return NextResponse.json(
          { error: 'Failed to create new campaigns' },
          { status: 500 }
        );
      } else {
        addedCount = insertedData?.length || 0;
        console.log(`Successfully created ${addedCount} new campaigns in Supabase.`);
      }
    }

    // Batch update existing records in Supabase
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({ 
            status: update.status,
            last_updated: new Date().toISOString() // Update timestamp when status changes
          })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Error updating campaign ${update.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`Updated campaign ${update.id} to status: ${update.status}`);
        }
      }
      console.log(`Successfully updated ${updatedCount} campaigns in Supabase.`);
    }

    const deletedCount = updates.filter(u => u.status === 'Deleted').length;

    console.log('Campaigns synced successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Campaigns synced successfully',
      stats: {
        added: addedCount,
        updated: updatedCount - deletedCount, // Live updates
        deleted: deletedCount,
        total: instantlyCampaigns.length
      }
    });

  } catch (error: any) {
    console.error('Error syncing campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to sync campaigns: ' + error.message },
      { status: 500 }
    );
  }
} 
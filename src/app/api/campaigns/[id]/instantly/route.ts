import { NextRequest, NextResponse } from 'next/server';

// Helper function to get API keys with fallbacks
async function getApiKeys() {
  try {
    // First try to get from Supabase settings table
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'api_keys')
      .single();
    
    if (settings?.value) {
      const apiKeys = JSON.parse(settings.value);
      if (apiKeys.instantly) {
        console.log('Using Instantly API key from settings table');
        return { instantlyApiKey: apiKeys.instantly };
      }
    }
  } catch (error) {
    console.log('Could not fetch from settings table, trying environment variables');
  }
  
  // Fallback to environment variables
  const instantlyApiKey = process.env.INSTANTLY_API_KEY;
  if (instantlyApiKey) {
    console.log('Using Instantly API key from environment variable');
    return { instantlyApiKey };
  }
  
  // Final fallback to hardcoded key
  console.log('Using hardcoded Instantly API key as fallback');
  return { instantlyApiKey: 'Tb5OWIKAEMen7IrvsJxOBPnEgWnLG' };
}

// Helper function to map status numbers to readable strings
function getStatusDisplay(status: number): string {
  switch (status) {
    case 0: return 'Draft';
    case 1: return 'Active';
    case 2: return 'Paused';
    case 3: return 'Completed';
    case 4: return 'Running Subsequences';
    case -99: return 'Account Suspended';
    case -1: return 'Accounts Unhealthy';
    case -2: return 'Bounce Protect';
    default: return 'Unknown';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Get the campaign from Supabase to get the instantly_id
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!campaign.instantly_id) {
      return NextResponse.json(
        { error: 'Campaign has no Instantly ID' },
        { status: 400 }
      );
    }

    // Get API keys
    const { instantlyApiKey } = await getApiKeys();
    console.log('Using Instantly API key:', instantlyApiKey ? 'Present' : 'Missing');

    if (!instantlyApiKey) {
      return NextResponse.json(
        { error: 'Instantly API key not configured' },
        { status: 500 }
      );
    }

    // Fetch campaign details from Instantly.ai using v1 API (same as sync)
    console.log('Making request to Instantly API for campaign ID:', campaign.instantly_id);
    const response = await fetch(
      `https://api.instantly.ai/api/v1/campaign/list?api_key=${instantlyApiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Instantly API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Failed to fetch campaign from Instantly: ${response.status}` },
        { status: response.status }
      );
    }

    const campaignsList = await response.json();
    
    if (!Array.isArray(campaignsList)) {
      console.error('Unexpected response format:', JSON.stringify(campaignsList));
      return NextResponse.json(
        { error: 'Unexpected response format from Instantly API' },
        { status: 500 }
      );
    }

    // Find the specific campaign in the list
    const campaignData = campaignsList.find(camp => camp.id === campaign.instantly_id);
    
    if (!campaignData) {
      // Campaign not found in Instantly - return basic info with a note
      return NextResponse.json({
        id: campaign.instantly_id,
        name: campaign.name,
        status: campaign.status,
        note: 'Campaign details not available from Instantly.ai (campaign may have been deleted or is not accessible)',
        local_data: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          created_at: campaign.created_at,
          last_updated: campaign.last_updated
        }
      });
    }

    // Transform the data to include readable status and formatted values
    const transformedData = {
      ...campaignData,
      status_display: getStatusDisplay(campaignData.status),
      timestamp_created_formatted: campaignData.timestamp_created ? 
        new Date(campaignData.timestamp_created).toLocaleString() : null,
      timestamp_updated_formatted: campaignData.timestamp_updated ? 
        new Date(campaignData.timestamp_updated).toLocaleString() : null,
      campaign_schedule_formatted: campaignData.campaign_schedule ? {
        ...campaignData.campaign_schedule,
        start_date_formatted: campaignData.campaign_schedule.start_date ? 
          new Date(campaignData.campaign_schedule.start_date).toLocaleDateString() : null,
        end_date_formatted: campaignData.campaign_schedule.end_date ? 
          new Date(campaignData.campaign_schedule.end_date).toLocaleDateString() : null,
      } : null,
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

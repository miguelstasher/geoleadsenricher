import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    // Fetch campaign from Supabase
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching campaign:', error);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Count leads that have been successfully uploaded to this campaign
    // We count leads where campaign name matches AND campaign_status is 'sent' (successfully uploaded)
    const { count: uploadedLeadsCount, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign', campaign.name)
      .eq('campaign_status', 'sent');

    if (countError) {
      console.error('Error counting uploaded leads:', countError);
      // Don't fail the request, just return 0 for the count
    }

    // Add the uploaded leads count to the campaign data
    const campaignWithCount = {
      ...campaign,
      uploadedLeadsCount: uploadedLeadsCount || 0
    };

    return NextResponse.json(campaignWithCount);

  } catch (error: any) {
    console.error('Error in campaign fetch endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
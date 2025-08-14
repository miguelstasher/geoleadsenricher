import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { campaignId, campaignName } = await request.json();

    if (!campaignName) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    // Update all leads with 'new' status for this campaign to 'sent'
    const { data, error } = await supabase
      .from('leads')
      .update({ 
        campaign_status: 'sent',
        last_modified: new Date().toISOString().slice(0, 16).replace('T', ' ')
      })
      .eq('campaign', campaignName)
      .eq('campaign_status', 'new')
      .select();

    if (error) {
      console.error('Error sending leads to campaign:', error);
      return NextResponse.json(
        { error: 'Failed to send leads to campaign' },
        { status: 500 }
      );
    }

    const updatedCount = data?.length || 0;

    console.log(`Successfully sent ${updatedCount} leads to Instantly for campaign: ${campaignName}`);

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${updatedCount} leads to Instantly`,
      updatedCount
    });

  } catch (error) {
    console.error('Error in send leads endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
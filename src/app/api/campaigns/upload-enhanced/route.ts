import { NextRequest, NextResponse } from 'next/server';

const AWS_LAMBDA_URL = 'https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper';

export async function POST(request: NextRequest) {
  try {
    const { leadIds, campaignId, campaignName } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Lead IDs are required' }, { status: 400 });
    }

    if (!campaignId || !campaignName) {
      return NextResponse.json({ error: 'Campaign ID and name are required' }, { status: 400 });
    }

    // Send to Supabase Edge Function for campaign upload (no timeout limits!)
    const SUPABASE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/campaign-upload`;
    
    const functionPayload = {
      leadIds: leadIds,
      campaignId: campaignId,
      campaignName: campaignName
    };

    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(functionPayload)
    });

    if (!response.ok) {
      throw new Error('Failed to start campaign upload');
    }

    return NextResponse.json({
      success: true,
      message: `Campaign upload started for ${leadIds.length} leads to ${campaignName}`,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error starting campaign upload:', error);
    return NextResponse.json({ error: 'Failed to start campaign upload' }, { status: 500 });
  }
}

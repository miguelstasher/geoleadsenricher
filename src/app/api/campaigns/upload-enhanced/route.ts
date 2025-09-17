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

    // Send to AWS Lambda for campaign upload (no timeout limits!)
    const lambdaPayload = {
      jobType: 'campaign_upload',
      leadIds: leadIds,
      campaignId: campaignId,
      campaignName: campaignName,
      supabaseConfig: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    };

    const response = await fetch(AWS_LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AWS_LAMBDA_AUTH_TOKEN || 'b24be261-f07b-4adf-a33c-cf87084b889b'}`
      },
      body: JSON.stringify(lambdaPayload)
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

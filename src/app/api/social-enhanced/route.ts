import { NextRequest, NextResponse } from 'next/server';

const AWS_LAMBDA_URL = 'https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper';

export async function POST(request: NextRequest) {
  try {
    const { leadIds, platform } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Lead IDs are required' }, { status: 400 });
    }

    if (!platform || !['linkedin', 'facebook'].includes(platform)) {
      return NextResponse.json({ error: 'Platform must be linkedin or facebook' }, { status: 400 });
    }

    // Send to Supabase Edge Function for social media URL enrichment
    const SUPABASE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/social-media-enrichment`;
    
    const functionPayload = {
      leadIds: leadIds,
      platform: platform
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
      throw new Error(`Failed to start ${platform} enrichment`);
    }

    return NextResponse.json({
      success: true,
      message: `${platform} enrichment started for ${leadIds.length} leads`,
      status: 'processing'
    });

  } catch (error) {
    console.error(`Error starting social enrichment:`, error);
    return NextResponse.json({ error: 'Failed to start social enrichment' }, { status: 500 });
  }
}

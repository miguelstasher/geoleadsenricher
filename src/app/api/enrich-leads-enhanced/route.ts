import { NextRequest, NextResponse } from 'next/server';

const AWS_LAMBDA_URL = 'https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper';

export async function POST(request: NextRequest) {
  try {
    const { leadIds } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Lead IDs are required' }, { status: 400 });
    }

    // Send to Supabase Edge Function for email enrichment (Hunter.io → Snov.io → AWS Lambda waterfall)
    const SUPABASE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email-enrichment`;
    
    const functionPayload = {
      leadIds: leadIds
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
      throw new Error('Failed to start enrichment process');
    }

    return NextResponse.json({
      success: true,
      message: `Email enrichment started for ${leadIds.length} leads`,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error starting enrichment:', error);
    return NextResponse.json({ error: 'Failed to start enrichment' }, { status: 500 });
  }
}

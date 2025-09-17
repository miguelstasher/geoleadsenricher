import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, leadId } = await request.json();

    if (!email || !leadId) {
      return NextResponse.json(
        { error: 'Email and leadId are required' },
        { status: 400 }
      );
    }

    // Verify email with Hunter.io
    const hunterApiKey = process.env.HUNTER_API_KEY;
    if (!hunterApiKey) {
      return NextResponse.json(
        { error: 'Hunter.io API key not configured' },
        { status: 500 }
      );
    }

    const hunterResponse = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${hunterApiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!hunterResponse.ok) {
      console.error('Hunter.io verification failed:', hunterResponse.status, hunterResponse.statusText);
      return NextResponse.json(
        { error: 'Email verification service unavailable' },
        { status: 503 }
      );
    }

    const hunterData = await hunterResponse.json();
    const verificationResult = hunterData.data;

    console.log('Hunter.io verification result:', verificationResult);

    // Determine email status based on confidence score (≥80% = valid, <80% = invalid)
    let emailStatus = 'unverified'; // Default to unverified
    
    const confidenceScore = verificationResult.score || 0;
    console.log('Confidence score:', confidenceScore);
    
    if (confidenceScore >= 80) {
      emailStatus = 'Valid';
    } else if (confidenceScore < 80) {
      emailStatus = 'Invalid';
    } else {
      emailStatus = 'Unverified';
    }
    
    console.log('Final email status based on confidence score:', emailStatus);

    // Update the lead in the database
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        email: email,
        email_status: emailStatus
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Failed to update lead:', updateError);
      return NextResponse.json(
        { error: 'Failed to update lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email: email,
      status: emailStatus,
      verificationResult: verificationResult
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

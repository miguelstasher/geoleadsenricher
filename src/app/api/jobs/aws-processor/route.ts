import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Use your existing AWS Lambda for heavy processing
const AWS_LAMBDA_EXTRACTION_URL = process.env.AWS_LAMBDA_EMAIL_SCRAPER_URL || 'https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper';

export async function POST(request: NextRequest) {
  try {
    const { type, params } = await request.json();

    // Create job record
    const { data: job, error } = await supabase
      .from('jobs')
      .insert([{
        type,
        params,
        status: 'queued',
        progress: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    // Send to AWS Lambda for actual processing (no timeout limits!)
    const lambdaPayload = {
      jobId: job.id,
      type: job.type,
      params: job.params,
      supabaseConfig: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    };

    // Fire and forget - AWS Lambda will handle the long processing
    fetch(AWS_LAMBDA_EXTRACTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AWS_LAMBDA_AUTH_TOKEN}`
      },
      body: JSON.stringify(lambdaPayload)
    }).catch(console.error);

    return NextResponse.json({ 
      jobId: job.id, 
      status: 'queued',
      message: 'Job sent to AWS Lambda for processing. No timeout limits!'
    });

  } catch (error) {
    console.error('Error queuing AWS job:', error);
    return NextResponse.json({ error: 'Failed to queue job' }, { status: 500 });
  }
}

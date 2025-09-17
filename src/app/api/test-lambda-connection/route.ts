import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const AWS_LAMBDA_URL = 'https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper';
    
    // Test the Lambda connection
    const testPayload = {
      test: true,
      message: 'Testing Lambda connection from Vercel'
    };

    console.log('Testing Lambda connection...');
    
    const response = await fetch(AWS_LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AWS_LAMBDA_AUTH_TOKEN || 'b24be261-f07b-4adf-a33c-cf87084b889b'}`
      },
      body: JSON.stringify(testPayload)
    });

    const responseData = await response.text();
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseData,
      lambdaUrl: AWS_LAMBDA_URL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lambda test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

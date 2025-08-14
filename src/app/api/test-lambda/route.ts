import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { website, name } = await request.json();

    console.log(`🧪 Testing AWS Lambda with:`, { website, name });

    const response = await axios.post(
      process.env.AWS_LAMBDA_EMAIL_SCRAPER_URL!,
      {
        website: website,
        name: name
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AWS_LAMBDA_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`📥 Raw Lambda response:`, response.data);
    console.log(`📥 Response type:`, typeof response.data);
    console.log(`📥 Response keys:`, Object.keys(response.data || {}));

    let email = null;

    // Try different ways to extract the email
    if (response.data && response.data.email) {
      email = response.data.email;
      console.log(`✅ Found email in response.data.email: ${email}`);
    } else if (response.data && typeof response.data === 'string') {
      try {
        const parsed = JSON.parse(response.data);
        if (parsed.email) {
          email = parsed.email;
          console.log(`✅ Found email in parsed string: ${email}`);
        }
      } catch (e) {
        console.log(`❌ Could not parse response as JSON:`, e);
      }
    } else if (response.data && response.data.body) {
      try {
        const parsedBody = JSON.parse(response.data.body);
        if (parsedBody.email) {
          email = parsedBody.email;
          console.log(`✅ Found email in response.data.body: ${email}`);
        }
      } catch (e) {
        console.log(`❌ Could not parse body as JSON:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      rawResponse: response.data,
      extractedEmail: email,
      hasEmail: !!email,
      emailIsValid: email && email !== 'not_found' && email !== 'No email found' && email !== 'Unknown'
    });

  } catch (error: any) {
    console.error('Test Lambda error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

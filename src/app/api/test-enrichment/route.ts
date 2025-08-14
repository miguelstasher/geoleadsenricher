import { NextRequest, NextResponse } from 'next/server';
import { enrichLeadEmailOptimized } from '../../../utils/emailEnrichmentOptimized';

export async function POST(request: NextRequest) {
  try {
    const { website, name } = await request.json();

    if (!website) {
      return NextResponse.json({ error: 'Website is required' }, { status: 400 });
    }

    console.log(`🧪 Testing enrichment for: ${name} (${website})`);

    const testLead = {
      id: 'test',
      name: name || 'Test Business',
      website: website,
      email: '',
      email_status: ''
    };

    const result = await enrichLeadEmailOptimized(testLead);

    console.log(`🧪 Test result:`, result);

    return NextResponse.json({
      success: true,
      result,
      testLead
    });

  } catch (error: any) {
    console.error('Test enrichment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

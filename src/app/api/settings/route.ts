import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { apiKeys } = await request.json();

    // Save API keys to a settings table in Supabase
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        key: 'api_keys',
        value: JSON.stringify(apiKeys),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (error) {
      console.error('Error saving API keys:', error);
      return NextResponse.json(
        { error: 'Failed to save API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in settings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Retrieve API keys from settings table
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'api_keys')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error retrieving API keys:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve API keys' },
        { status: 500 }
      );
    }

    const apiKeys = data ? JSON.parse(data.value) : {
      hunter: '',
      snov: '',
      instantly: '',
      googleMaps: ''
    };

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('Error in settings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

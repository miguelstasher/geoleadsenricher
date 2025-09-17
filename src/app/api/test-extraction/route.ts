import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing extraction system...');
    
    // Test 1: Check environment variables
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCWLWBJJeNyMsV1ieKMQl53OJuzZLOYP-k';
    console.log('Google API Key available:', !!googleApiKey);
    
    // Test 2: Check Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('search_history')
      .select('count(*)')
      .limit(1);
    
    console.log('Supabase connection:', testError ? 'Failed' : 'Working');
    if (testError) console.log('Supabase error:', testError);
    
    // Test 3: Try to create a test search record
    const testSearchData = {
      search_method: 'coordinates',
      city: 'London',
      country: null,
      coordinates: '51.5074,-0.1278',
      radius: 500,
      categories: ['hotel', 'restaurant'],
      other_categories: null,
      selected_group: null,
      currency: 'GBP',
      created_by: 'test@example.com',
      total_results: 0,
      results: null,
      status: 'pending' as const
    };

    const { data: insertData, error: insertError } = await supabase
      .from('search_history')
      .insert([testSearchData])
      .select()
      .single();

    console.log('Test search creation:', insertError ? 'Failed' : 'Success');
    if (insertError) console.log('Insert error:', insertError);
    
    // Test 4: Try Google Maps API call
    let googleMapsTest = 'Not tested';
    try {
      const testUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=51.5074,-0.1278&radius=500&type=restaurant&key=${googleApiKey}`;
      const response = await fetch(testUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results?.length > 0) {
        googleMapsTest = `Working - Found ${data.results.length} places`;
      } else if (data.error_message) {
        googleMapsTest = `Error: ${data.error_message}`;
      } else {
        googleMapsTest = `Status: ${data.status}`;
      }
    } catch (error) {
      googleMapsTest = `Failed: ${error}`;
    }

    // Test 5: Check jobs table
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('count(*)')
      .limit(1);
    
    console.log('Jobs table access:', jobsError ? 'Failed' : 'Working');
    if (jobsError) console.log('Jobs error:', jobsError);

    // Clean up test data
    if (insertData && !insertError) {
      await supabase
        .from('search_history')
        .delete()
        .eq('id', insertData.id);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tests: {
        googleApiKey: !!googleApiKey,
        supabaseConnection: !testError,
        searchHistoryTable: !insertError,
        googleMapsAPI: googleMapsTest,
        jobsTable: !jobsError
      },
      errors: {
        supabase: testError?.message || null,
        searchInsert: insertError?.message || null,
        jobs: jobsError?.message || null
      },
      recommendations: [
        !googleApiKey ? 'Google Maps API key missing' : null,
        testError ? 'Supabase connection failed' : null,
        insertError ? 'Cannot insert search records' : null,
        jobsError ? 'Jobs table not accessible' : null,
        googleMapsTest.includes('Error') || googleMapsTest.includes('Failed') ? 'Google Maps API issue' : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Test extraction error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

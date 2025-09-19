import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const debugLog: string[] = [];
  
  try {
    debugLog.push('🔍 DEBUG: Starting extraction debug...');
    
    // Test 1: Check environment variables
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCWLWBJJeNyMsV1ieKMQl53OJuzZLOYP-k';
    debugLog.push(`✅ Google API Key: ${googleApiKey ? 'Available' : 'Missing'}`);
    debugLog.push(`✅ Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Available' : 'Missing'}`);
    debugLog.push(`✅ Supabase Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Available' : 'Missing'}`);
    
    // Test 2: Test Google Maps API directly
    debugLog.push('🗺️ Testing Google Maps API directly...');
    const testCoords = '51.5074,-0.1278';
    const testUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${testCoords}&radius=500&type=restaurant&key=${googleApiKey}`;
    
    try {
      const googleResponse = await fetch(testUrl);
      const googleData = await googleResponse.json();
      
      if (googleData.status === 'OK' && googleData.results?.length > 0) {
        debugLog.push(`✅ Google Maps API: Working - Found ${googleData.results.length} places`);
        debugLog.push(`📍 First place: ${googleData.results[0].name}`);
      } else {
        debugLog.push(`❌ Google Maps API: Status = ${googleData.status}`);
        if (googleData.error_message) {
          debugLog.push(`❌ Google Error: ${googleData.error_message}`);
        }
      }
    } catch (googleError) {
      debugLog.push(`❌ Google Maps API Error: ${googleError}`);
    }
    
    // Test 3: Test Supabase connection
    debugLog.push('🗄️ Testing Supabase connection...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('search_history')
        .select('count(*)')
        .limit(1);
      
      if (testError) {
        debugLog.push(`❌ Supabase Error: ${testError.message}`);
      } else {
        debugLog.push(`✅ Supabase: Connected successfully`);
      }
    } catch (supabaseError) {
      debugLog.push(`❌ Supabase Connection Error: ${supabaseError}`);
    }
    
    // Test 4: Test creating a search record
    debugLog.push('📝 Testing search record creation...');
    try {
      const testSearchData = {
        search_method: 'coordinates',
        city: 'London',
        coordinates: '51.5074,-0.1278',
        radius: 500,
        categories: ['restaurant'],
        currency: 'GBP',
        created_by: 'debug@test.com',
        total_results: 0,
        status: 'pending' as const
      };

      const { data: insertData, error: insertError } = await supabase
        .from('search_history')
        .insert([testSearchData])
        .select()
        .single();

      if (insertError) {
        debugLog.push(`❌ Search Insert Error: ${insertError.message}`);
        debugLog.push(`❌ Error Details: ${JSON.stringify(insertError)}`);
      } else {
        debugLog.push(`✅ Search Record Created: ID ${insertData.id}`);
        
        // Clean up test record
        await supabase.from('search_history').delete().eq('id', insertData.id);
        debugLog.push(`🧹 Test record cleaned up`);
      }
    } catch (insertError) {
      debugLog.push(`❌ Insert Exception: ${insertError}`);
    }
    
    // Test 5: Test Supabase Edge Function
    debugLog.push('🚀 Testing Supabase Edge Function...');
    try {
      const SUPABASE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-maps-extraction`;
      debugLog.push(`📡 Function URL: ${SUPABASE_FUNCTION_URL}`);
      
      const functionPayload = {
        searchId: 'debug-test',
        searchData: {
          search_method: 'coordinates',
          coordinates: '51.5074,-0.1278',
          radius: 500,
          categories: ['restaurant'],
          currency: 'GBP',
          created_by: 'debug@test.com'
        }
      };

      const functionResponse = await fetch(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(functionPayload)
      });

      debugLog.push(`📊 Function Response Status: ${functionResponse.status}`);
      
      if (functionResponse.ok) {
        const functionData = await functionResponse.json();
        debugLog.push(`✅ Supabase Edge Function: Working`);
        debugLog.push(`📋 Function Response: ${JSON.stringify(functionData)}`);
      } else {
        const errorText = await functionResponse.text();
        debugLog.push(`❌ Supabase Edge Function Error: ${errorText}`);
      }
    } catch (functionError) {
      debugLog.push(`❌ Edge Function Exception: ${functionError}`);
    }
    
    // Test 6: Check jobs table
    debugLog.push('⚙️ Testing jobs table...');
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('count(*)')
        .limit(1);
      
      if (jobsError) {
        debugLog.push(`❌ Jobs Table Error: ${jobsError.message}`);
      } else {
        debugLog.push(`✅ Jobs Table: Accessible`);
      }
    } catch (jobsError) {
      debugLog.push(`❌ Jobs Table Exception: ${jobsError}`);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      debugLog: debugLog,
      summary: {
        googleMapsApi: debugLog.some(log => log.includes('Google Maps API: Working')),
        supabaseConnection: debugLog.some(log => log.includes('Supabase: Connected successfully')),
        searchRecordCreation: debugLog.some(log => log.includes('Search Record Created')),
        edgeFunction: debugLog.some(log => log.includes('Supabase Edge Function: Working')),
        jobsTable: debugLog.some(log => log.includes('Jobs Table: Accessible'))
      }
    });

  } catch (error) {
    debugLog.push(`❌ CRITICAL ERROR: ${error}`);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      debugLog: debugLog,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

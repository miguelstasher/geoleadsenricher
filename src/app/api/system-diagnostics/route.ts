import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Running system diagnostics...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        googleMapsApiKey: !!process.env.GOOGLE_MAPS_API_KEY
      },
      database: {
        connected: false,
        error: null,
        searchHistoryCount: 0,
        stuckSearchesCount: 0
      },
      api: {
        working: false,
        error: null
      }
    };
    
    // Test database connection
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // Test basic connection
      const { data: searches, error: readError } = await supabase
        .from('search_history')
        .select('id, status, created_at')
        .limit(10);
      
      if (readError) {
        diagnostics.database.error = readError.message;
        console.error('❌ Database read error:', readError);
      } else {
        diagnostics.database.connected = true;
        diagnostics.database.searchHistoryCount = searches?.length || 0;
        console.log('✅ Database connection successful');
      }
      
      // Test stuck searches
      const { data: stuckSearches, error: stuckError } = await supabase
        .from('search_history')
        .select('id, status, processing_started_at')
        .eq('status', 'in_process');
      
      if (!stuckError) {
        diagnostics.database.stuckSearchesCount = stuckSearches?.length || 0;
        console.log(`📊 Found ${diagnostics.database.stuckSearchesCount} stuck searches`);
      }
      
    } catch (dbError) {
      diagnostics.database.error = dbError instanceof Error ? dbError.message : 'Unknown database error';
      console.error('❌ Database connection failed:', dbError);
    }
    
    // Test API functionality
    try {
      const testResponse = await fetch(`${request.nextUrl.origin}/api/test-connection`, {
        method: 'GET'
      });
      
      if (testResponse.ok) {
        diagnostics.api.working = true;
        console.log('✅ API test successful');
      } else {
        diagnostics.api.error = `API test failed with status ${testResponse.status}`;
        console.error('❌ API test failed:', testResponse.status);
      }
    } catch (apiError) {
      diagnostics.api.error = apiError instanceof Error ? apiError.message : 'Unknown API error';
      console.error('❌ API test error:', apiError);
    }
    
    const isHealthy = diagnostics.database.connected && diagnostics.api.working;
    
    return NextResponse.json({
      success: isHealthy,
      message: isHealthy ? 'System is healthy' : 'System has issues',
      diagnostics
    });
    
  } catch (error) {
    console.error('❌ System diagnostics failed:', error);
    return NextResponse.json({
      success: false,
      error: 'System diagnostics failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

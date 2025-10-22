import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('📋 Environment Variables:');
    console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('SUPABASE_KEY:', supabaseKey ? 'Set' : 'Missing');
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          supabaseUrl: !!supabaseUrl,
          supabaseKey: !!supabaseKey
        }
      }, { status: 500 });
    }
    
    // Test Supabase connection
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('search_history')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection error:', error);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: error.message
      }, { status: 500 });
    }
    
    console.log('✅ Database connection successful');
    
    // Test authentication
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection and authentication working',
      details: {
        databaseConnected: true,
        authenticationWorking: !authError,
        searchHistoryAccessible: true,
        environmentVariables: {
          supabaseUrl: !!supabaseUrl,
          supabaseKey: !!supabaseKey
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing API functionality...');
    
    // Test 1: Check if we can read from search_history
    const { data: searches, error: readError } = await supabase
      .from('search_history')
      .select('id, status, created_at')
      .limit(5);
    
    if (readError) {
      console.error('❌ Read test failed:', readError);
      return NextResponse.json({
        success: false,
        error: 'Read test failed',
        details: readError.message
      }, { status: 500 });
    }
    
    console.log('✅ Read test passed');
    
    // Test 2: Check if we can update a record (without actually changing anything)
    const testSearchId = searches?.[0]?.id;
    if (testSearchId) {
      const { error: updateError } = await supabase
        .from('search_history')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', testSearchId);
      
      if (updateError) {
        console.error('❌ Update test failed:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Update test failed',
          details: updateError.message
        }, { status: 500 });
      }
      
      console.log('✅ Update test passed');
    }
    
    // Test 3: Check stuck searches
    const { data: stuckSearches, error: stuckError } = await supabase
      .from('search_history')
      .select('id, status, processing_started_at')
      .eq('status', 'in_process');
    
    if (stuckError) {
      console.error('❌ Stuck searches query failed:', stuckError);
      return NextResponse.json({
        success: false,
        error: 'Stuck searches query failed',
        details: stuckError.message
      }, { status: 500 });
    }
    
    console.log('✅ Stuck searches query passed');
    
    return NextResponse.json({
      success: true,
      message: 'All API tests passed',
      details: {
        readTest: true,
        updateTest: true,
        stuckSearchesQuery: true,
        stuckSearchesCount: stuckSearches?.length || 0,
        totalSearches: searches?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

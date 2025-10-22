import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { searchId } = await request.json();
    
    if (!searchId) {
      return NextResponse.json({ error: 'Search ID is required' }, { status: 400 });
    }
    
    console.log(`🔄 Retrying stuck search: ${searchId}`);
    
    // Call the direct extraction method
    const directResponse = await fetch(`${request.nextUrl.origin}/api/extraction-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchId: searchId
      })
    });

    if (!directResponse.ok) {
      const errorData = await directResponse.json();
      console.error('❌ Direct extraction failed:', errorData);
      
      // Update search status to failed
      await supabase
        .from('search_history')
        .update({ 
          status: 'failed',
          error_message: errorData.error || 'Retry failed',
          failed_at: new Date().toISOString()
        })
        .eq('id', searchId);
      
      return NextResponse.json({ 
        error: 'Retry failed',
        details: errorData.error || 'Unknown error'
      }, { status: 500 });
    }

    const directResult = await directResponse.json();
    console.log('✅ Retry completed:', directResult);

    return NextResponse.json({ 
      success: true, 
      message: 'Search retry completed successfully',
      searchId: searchId,
      processed: directResult.processed
    });
    
  } catch (error) {
    console.error('❌ Retry error:', error);
    return NextResponse.json({ 
      error: 'Retry failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing stuck searches...');
    
    // Get all searches that are stuck in 'in_process' for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckSearches, error: fetchError } = await supabase
      .from('search_history')
      .select('*')
      .eq('status', 'in_process')
      .lt('processing_started_at', fiveMinutesAgo);
    
    if (fetchError) {
      console.error('❌ Error fetching stuck searches:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch stuck searches' }, { status: 500 });
    }
    
    if (!stuckSearches || stuckSearches.length === 0) {
      console.log('✅ No stuck searches found');
      return NextResponse.json({ message: 'No stuck searches found' });
    }
    
    console.log(`🔍 Found ${stuckSearches.length} stuck searches`);
    
    // Update each stuck search to failed status
    for (const search of stuckSearches) {
      const { error: updateError } = await supabase
        .from('search_history')
        .update({ 
          status: 'failed',
          error_message: 'Search timed out - processing took too long',
          failed_at: new Date().toISOString()
        })
        .eq('id', search.id);
      
      if (updateError) {
        console.error(`❌ Error updating search ${search.id}:`, updateError);
      } else {
        console.log(`✅ Updated search ${search.id} to failed status`);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Fixed ${stuckSearches.length} stuck searches`,
      fixed: stuckSearches.length
    });
    
  } catch (error) {
    console.error('❌ Error fixing stuck searches:', error);
    return NextResponse.json({ 
      error: 'Failed to fix stuck searches',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

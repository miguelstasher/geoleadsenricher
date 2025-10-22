import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Deleting stuck searches...');
    
    // Get all searches that are stuck in 'in_process' status
    const { data: stuckSearches, error: fetchError } = await supabase
      .from('search_history')
      .select('*')
      .eq('status', 'in_process');
    
    if (fetchError) {
      console.error('❌ Error fetching stuck searches:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch stuck searches' }, { status: 500 });
    }
    
    if (!stuckSearches || stuckSearches.length === 0) {
      console.log('✅ No stuck searches found');
      return NextResponse.json({ message: 'No stuck searches found' });
    }
    
    console.log(`🔍 Found ${stuckSearches.length} stuck searches to delete`);
    
    // Delete each stuck search
    let deletedCount = 0;
    for (const search of stuckSearches) {
      const { error: deleteError } = await supabase
        .from('search_history')
        .delete()
        .eq('id', search.id);
      
      if (deleteError) {
        console.error(`❌ Error deleting search ${search.id}:`, deleteError);
      } else {
        console.log(`✅ Deleted search ${search.id}`);
        deletedCount++;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${deletedCount} stuck searches`,
      deleted: deletedCount,
      total: stuckSearches.length
    });
    
  } catch (error) {
    console.error('❌ Error deleting stuck searches:', error);
    return NextResponse.json({ 
      error: 'Failed to delete stuck searches',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

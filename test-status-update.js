#!/usr/bin/env node

/**
 * Test status update functionality
 * This script tests if the status updates are working properly
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'
);

async function testStatusUpdate() {
  console.log('🧪 Testing status update functionality...');
  
  try {
    // Get the latest search
    const { data: searches, error: fetchError } = await supabase
      .from('search_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('❌ Error fetching searches:', fetchError);
      return;
    }
    
    if (!searches || searches.length === 0) {
      console.log('ℹ️ No searches found');
      return;
    }
    
    const latestSearch = searches[0];
    console.log(`📋 Latest search: ${latestSearch.id}`);
    console.log(`📊 Current status: ${latestSearch.status}`);
    console.log(`📊 Total results: ${latestSearch.total_results}`);
    console.log(`📊 Processed count: ${latestSearch.processed_count}`);
    
    // Test updating status to completed
    const { error: updateError } = await supabase
      .from('search_history')
      .update({ 
        status: 'completed',
        total_results: 5,
        processed_count: 5
      })
      .eq('id', latestSearch.id);
    
    if (updateError) {
      console.error('❌ Error updating status:', updateError);
    } else {
      console.log('✅ Status update successful');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testStatusUpdate();

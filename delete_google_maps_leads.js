const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zrgmktqkvnywsatxyfdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo'
);

async function deleteGoogleMapsLeads() {
  console.log('=== DELETING GOOGLE MAPS LEADS ===\n');
  
  // First, show what will be deleted
  const { data: leadsToDelete, error: fetchError } = await supabase
    .from('leads')
    .select('id, name, business_type, source')
    .eq('source', 'Google Maps API');
    
  if (fetchError) {
    console.error('Error fetching leads:', fetchError);
    return;
  }
  
  console.log(`📋 Found ${leadsToDelete.length} Google Maps API leads to delete:`);
  leadsToDelete.forEach((lead, index) => {
    console.log(`   ${index + 1}. ${lead.name} (${lead.business_type})`);
  });
  
  console.log('\n🗑️  Deleting all Google Maps API leads...\n');
  
  // Delete all Google Maps API leads
  const { error: deleteError, count } = await supabase
    .from('leads')
    .delete({ count: 'exact' })
    .eq('source', 'Google Maps API');
    
  if (deleteError) {
    console.error('❌ Error deleting leads:', deleteError);
    return;
  }
  
  console.log(`✅ Successfully deleted ${count} Google Maps API leads!`);
  
  // Check remaining leads
  const { count: remainingCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact' });
    
  console.log(`📊 Remaining leads in database: ${remainingCount}`);
  
  // Show remaining leads
  const { data: remainingLeads } = await supabase
    .from('leads')
    .select('name, business_type, source')
    .order('created_at', { ascending: false });
    
  if (remainingLeads && remainingLeads.length > 0) {
    console.log('\n📋 Remaining leads:');
    remainingLeads.forEach((lead, index) => {
      console.log(`   ${index + 1}. ${lead.name} (${lead.business_type}) - Source: ${lead.source}`);
    });
  }
  
  console.log('\n✅ Cleanup complete! Supabase database is now synced with your geoleads enricher.');
}

deleteGoogleMapsLeads().catch(console.error); 
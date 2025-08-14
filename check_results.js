const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zrgmktqkvnywsatxyfdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo'
);

async function checkResults() {
  console.log('=== FINAL RESULTS ===\n');
  
  // Get latest search
  const { data: searches } = await supabase
    .from('search_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
    
  console.log('Recent searches:');
  searches.forEach(search => {
    console.log(`- ${search.created_at.substring(0, 16)} | ${search.search_method} | ${search.status} | ${search.total_results} results | ${search.processed_count || 0} processed`);
  });
  
  // Check total leads
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact' });
    
  console.log(`\nTotal leads in database: ${totalLeads}`);
  
  // Check Google Maps leads
  const { data: gmLeads, count: gmCount } = await supabase
    .from('leads')
    .select('name, business_type, city, source, created_at', { count: 'exact' })
    .eq('source', 'Google Maps API')
    .order('created_at', { ascending: false });
    
  console.log(`Google Maps API leads: ${gmCount}`);
  
  if (gmLeads && gmLeads.length > 0) {
    console.log('\nRecent Google Maps leads:');
    gmLeads.slice(0, 10).forEach(lead => {
      console.log(`- ${lead.name} (${lead.business_type}) - ${lead.city}`);
    });
  }
  
  // Check for any remaining in-process searches
  const { data: inProcess } = await supabase
    .from('search_history')
    .select('*')
    .eq('status', 'in_process');
    
  if (inProcess && inProcess.length > 0) {
    console.log('\n⚠️  There are still searches in process');
  } else {
    console.log('\n✅ No searches currently in process');
  }
}

checkResults().catch(console.error); 
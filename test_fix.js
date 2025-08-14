const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zrgmktqkvnywsatxyfdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo'
);

async function testFix() {
  // Get the latest "in_process" search
  const { data: searches } = await supabase
    .from('search_history')
    .select('*')
    .eq('status', 'in_process')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (searches && searches.length > 0) {
    const search = searches[0];
    console.log(`Found in-process search: ${search.id}`);
    console.log(`Processed: ${search.processed_count}/${search.total_results}`);
    
    // Trigger it again to continue processing with the fix
    const response = await fetch('http://localhost:3000/api/scrape-google-maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchId: search.id })
    });
    
    const result = await response.json();
    console.log('Restarted processing:', result);
    
    // Wait and check progress
    setTimeout(async () => {
      const { data: updated } = await supabase
        .from('search_history')
        .select('*')
        .eq('id', search.id)
        .single();
        
      console.log(`\nAfter restart: ${updated.processed_count}/${updated.total_results} - Status: ${updated.status}`);
      
      const { count } = await supabase.from('leads').select('*', { count: 'exact' });
      console.log(`Total leads: ${count}`);
    }, 15000);
  } else {
    console.log('No in-process searches found');
  }
}

testFix().catch(console.error); 
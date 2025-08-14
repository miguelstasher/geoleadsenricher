const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zrgmktqkvnywsatxyfdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo'
);

async function debugGeoLeadsSync() {
  console.log('=== DEBUGGING GEOLEADS SYNC ISSUE ===\n');
  
  // Check current Supabase state
  const { data: supabaseLeads, count: supabaseCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
    
  console.log(`📊 SUPABASE DATABASE:`);
  console.log(`   Total leads: ${supabaseCount}`);
  
  if (supabaseLeads && supabaseLeads.length > 0) {
    console.log('   Current leads:');
    supabaseLeads.forEach((lead, index) => {
      const created = new Date(lead.created_at).toLocaleString();
      console.log(`   ${index + 1}. ${lead.name} (${lead.source}) - Created: ${created}`);
    });
  }
  
  console.log('\n🔍 POSSIBLE CAUSES OF REAPPEARING LEADS:\n');
  
  console.log('1. 🔄 SEPARATE DATABASES:');
  console.log('   - Geoleads enricher might use its own database');
  console.log('   - Only imports/syncs with Supabase occasionally');
  console.log('   - When you delete in geoleads, it doesn\'t delete from Supabase\n');
  
  console.log('2. 🕐 BACKGROUND SYNC PROCESS:');
  console.log('   - There might be a scheduled job running');
  console.log('   - Could be syncing leads between systems');
  console.log('   - Check for cron jobs or scheduled tasks\n');
  
  console.log('3. 💾 CACHE ISSUES:');
  console.log('   - Geoleads enricher might be caching data');
  console.log('   - Browser cache could be showing old data');
  console.log('   - Try refreshing the page or clearing cache\n');
  
  console.log('4. 🔄 API SYNC:');
  console.log('   - Geoleads might be pulling data from Supabase periodically');
  console.log('   - When you delete in geoleads, Supabase re-imports them\n');
  
  console.log('=== SOLUTIONS TO TRY ===\n');
  
  console.log('✅ OPTION 1: Clear Supabase completely');
  console.log('   Run: node delete_all_leads.js');
  console.log('   This removes ALL leads from Supabase\n');
  
  console.log('✅ OPTION 2: Check geoleads enricher settings');
  console.log('   Look for "sync", "import", or "data source" settings');
  console.log('   Disable automatic syncing with Supabase\n');
  
  console.log('✅ OPTION 3: Monitor during deletion');
  console.log('   Run: node monitor_activity.js');
  console.log('   Then delete leads in geoleads enricher');
  console.log('   See if Supabase changes in real-time\n');
  
  console.log('✅ OPTION 4: Check browser network tab');
  console.log('   Open Chrome DevTools → Network tab');
  console.log('   Delete a lead in geoleads enricher');
  console.log('   See what API calls are made\n');
  
  // Check if there are recent search activities
  const { data: recentSearches } = await supabase
    .from('search_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentSearches && recentSearches.length > 0) {
    console.log('📈 RECENT SEARCH ACTIVITY:');
    recentSearches.forEach(search => {
      const created = new Date(search.created_at).toLocaleString();
      console.log(`   - ${search.search_method} search: ${search.total_results} results (${created})`);
    });
    console.log('   ⚠️  Recent searches might be re-populating leads\n');
  }
}

debugGeoLeadsSync().catch(console.error); 
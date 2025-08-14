const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zrgmktqkvnywsatxyfdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo'
);

async function monitorActivity() {
  console.log('=== MONITORING DATABASE ACTIVITY ===\n');
  console.log('Watching for any changes in Supabase...\n');
  
  let previousCount = 0;
  let previousLeads = [];
  
  const checkForChanges = async () => {
    try {
      // Check total count
      const { count: currentCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact' });
      
      // Get all leads
      const { data: currentLeads } = await supabase
        .from('leads')
        .select('id, name, source, created_at')
        .order('created_at', { ascending: false });
        
      // Check for changes
      if (currentCount !== previousCount) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`\n🔔 [${timestamp}] CHANGE DETECTED!`);
        console.log(`   Lead count changed: ${previousCount} → ${currentCount}`);
        
        if (currentCount > previousCount) {
          // New leads added
          const newLeads = currentLeads.slice(0, currentCount - previousCount);
          console.log(`   ➕ NEW LEADS ADDED:`);
          newLeads.forEach(lead => {
            console.log(`      - ${lead.name} (Source: ${lead.source})`);
          });
        } else {
          // Leads removed
          console.log(`   ➖ LEADS REMOVED: ${previousCount - currentCount}`);
        }
        
        previousCount = currentCount;
        previousLeads = currentLeads;
      }
      
      // Show current status every 30 seconds
      const now = new Date();
      if (now.getSeconds() % 30 === 0) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] Current status: ${currentCount} leads in Supabase`);
      }
      
    } catch (error) {
      console.error('Error monitoring:', error.message);
    }
  };
  
  // Initial check
  const { count: initialCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact' });
    
  const { data: initialLeads } = await supabase
    .from('leads')
    .select('id, name, source, created_at')
    .order('created_at', { ascending: false });
    
  previousCount = initialCount;
  previousLeads = initialLeads;
  
  console.log(`📊 Initial state: ${initialCount} leads in Supabase`);
  if (initialLeads && initialLeads.length > 0) {
    console.log('Current leads:');
    initialLeads.forEach(lead => {
      console.log(`   - ${lead.name} (Source: ${lead.source})`);
    });
  }
  
  console.log('\n👀 Monitoring for changes... (Press Ctrl+C to stop)\n');
  
  // Check every 2 seconds
  setInterval(checkForChanges, 2000);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Monitoring stopped by user');
  process.exit(0);
});

monitorActivity().catch(console.error); 
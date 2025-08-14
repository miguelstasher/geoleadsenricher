const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zrgmktqkvnywsatxyfdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo'
);

async function manageLeads() {
  console.log('=== SUPABASE LEADS MANAGEMENT ===\n');
  
  // Get all leads with details
  const { data: allLeads, error } = await supabase
    .from('leads')
    .select('id, name, business_type, city, source, location, created_at')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }
  
  console.log(`📊 Total leads in Supabase: ${allLeads.length}\n`);
  
  // Group by source
  const groupedLeads = allLeads.reduce((acc, lead) => {
    const source = lead.source || 'Unknown';
    if (!acc[source]) acc[source] = [];
    acc[source].push(lead);
    return acc;
  }, {});
  
  // Display leads by source
  Object.keys(groupedLeads).forEach(source => {
    console.log(`📁 ${source}: ${groupedLeads[source].length} leads`);
    groupedLeads[source].slice(0, 5).forEach(lead => {
      console.log(`   - ${lead.name} (${lead.business_type}) - ${lead.city}`);
      if (lead.location) {
        console.log(`     📍 ${lead.location}`);
      }
    });
    if (groupedLeads[source].length > 5) {
      console.log(`   ... and ${groupedLeads[source].length - 5} more`);
    }
    console.log('');
  });
  
  console.log('=== MANAGEMENT OPTIONS ===\n');
  console.log('To delete leads, uncomment one of these options below:\n');
  
  // Option 1: Delete all Google Maps leads
  console.log('// Option 1: Delete ALL Google Maps API leads');
  console.log('// const { error: deleteError } = await supabase');
  console.log('//   .from("leads")');
  console.log('//   .delete()');
  console.log('//   .eq("source", "Google Maps API");');
  console.log('// console.log("Deleted all Google Maps leads:", deleteError ? deleteError : "Success");\n');
  
  // Option 2: Delete leads from today
  const today = new Date().toISOString().split('T')[0];
  console.log('// Option 2: Delete leads created today');
  console.log('// const { error: deleteError } = await supabase');
  console.log('//   .from("leads")');
  console.log(`//   .delete()`);
  console.log(`//   .gte("created_at", "${today}");`);
  console.log('// console.log("Deleted today\'s leads:", deleteError ? deleteError : "Success");\n');
  
  // Option 3: Delete specific lead by ID
  console.log('// Option 3: Delete specific lead by ID');
  console.log('// const { error: deleteError } = await supabase');
  console.log('//   .from("leads")');
  console.log('//   .delete()');
  console.log('//   .eq("id", LEAD_ID_HERE);');
  console.log('// console.log("Deleted specific lead:", deleteError ? deleteError : "Success");\n');
  
  // Option 4: Keep only the original lead
  const originalLead = allLeads.find(lead => lead.source !== 'Google Maps API');
  if (originalLead) {
    console.log('// Option 4: Keep only the original lead and delete all Google Maps leads');
    console.log(`// Original lead: "${originalLead.name}" (ID: ${originalLead.id})`);
    console.log('// const { error: deleteError } = await supabase');
    console.log('//   .from("leads")');
    console.log('//   .delete()');
    console.log('//   .eq("source", "Google Maps API");');
    console.log('// console.log("Kept original lead, deleted Google Maps leads:", deleteError ? deleteError : "Success");\n');
  }
  
  console.log('=== TO DELETE LEADS ===');
  console.log('1. Edit this file (manage_leads.js)');
  console.log('2. Uncomment one of the delete options above');
  console.log('3. Run the script again: node manage_leads.js');
  console.log('4. The leads will be permanently deleted from Supabase\n');
  
  // UNCOMMENT ONE OF THESE TO DELETE LEADS:
  
  // 🔥 DANGER ZONE - UNCOMMENT TO DELETE 🔥
  
  // Delete all Google Maps API leads:
  // const { error: deleteError } = await supabase
  //   .from('leads')
  //   .delete()
  //   .eq('source', 'Google Maps API');
  // console.log('🗑️  Deleted all Google Maps leads:', deleteError ? deleteError : 'Success!');
  
  // Delete leads from today:
  // const { error: deleteError } = await supabase
  //   .from('leads')
  //   .delete()
  //   .gte('created_at', today);
  // console.log('🗑️  Deleted today\'s leads:', deleteError ? deleteError : 'Success!');
  
  // Delete specific leads by name (example):
  // const { error: deleteError } = await supabase
  //   .from('leads')
  //   .delete()
  //   .in('name', ['Fallow', 'Thai Square Trafalgar Square']);
  // console.log('🗑️  Deleted specific leads:', deleteError ? deleteError : 'Success!');
}

manageLeads().catch(console.error); 
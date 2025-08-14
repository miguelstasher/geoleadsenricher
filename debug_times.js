const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://zrgmktqkvnywsatxyfdt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTimes() {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('name, created_at, last_modified');

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    for (const lead of leads) {
      console.log(`\n📄 ${lead.name}:`);
      console.log(`   Raw created_at: "${lead.created_at}"`);
      console.log(`   Raw last_modified: "${lead.last_modified}"`);
      
      const createdDate = new Date(lead.created_at);
      const modifiedDate = new Date(lead.last_modified);
      
      console.log(`   Date objects:`);
      console.log(`     Created: ${createdDate}`);
      console.log(`     Modified: ${modifiedDate}`);
      
      console.log(`   UTC ISO strings:`);
      console.log(`     Created: ${createdDate.toISOString()}`);
      console.log(`     Modified: ${modifiedDate.toISOString()}`);
      
      console.log(`   Current frontend formatting (en-GB + Europe/London):`);
      console.log(`     Created: ${createdDate.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Europe/London'
      })}`);
      console.log(`     Modified: ${modifiedDate.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Europe/London'
      })}`);
      
      // Test if timestamps are actually UTC
      console.log(`   Testing: Is "${lead.created_at}" being treated as UTC?`);
      const utcTest = new Date(lead.created_at + (lead.created_at.includes('Z') ? '' : 'Z'));
      console.log(`     With Z added: ${utcTest.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Europe/London'
      })}`);
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

debugTimes(); 
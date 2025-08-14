const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://zrgmktqkvnywsatxyfdt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreAndFix() {
  try {
    console.log('🔧 Fixing timestamps to show correct UK times...');
    
    // Set created_at to show 3:46 PM UK time (which means 2:46 PM UTC)
    // Set last_modified to show 4:34 PM UK time (which means 3:34 PM UTC)
    
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Current UK time: ${now.toLocaleString('en-GB', { timeZone: 'Europe/London' })}`);
    
    // For created_at: 3:46 PM UK = 2:46 PM UTC on June 16, 2025
    const createdAtUTC = new Date('2025-06-16T14:46:39.000Z');
    
    // For last_modified: Current time (should show 4:34 PM UK)
    const lastModifiedUTC = new Date(); // This will be UTC time
    
    console.log(`\nSetting timestamps:`);
    console.log(`   created_at UTC: ${createdAtUTC.toISOString()}`);
    console.log(`   created_at UK: ${createdAtUTC.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Europe/London'
    })}`);
    
    console.log(`   last_modified UTC: ${lastModifiedUTC.toISOString()}`);
    console.log(`   last_modified UK: ${lastModifiedUTC.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Europe/London'
    })}`);

    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        created_at: createdAtUTC.toISOString(),
        last_modified: lastModifiedUTC.toISOString()
      })
      .eq('name', 'Conciergerie Sejourneur Bordeaux');

    if (updateError) {
      console.error(`❌ Error updating:`, updateError);
    } else {
      console.log(`✅ Updated timestamps successfully!`);
    }

    console.log('\n🎉 Timestamp fix completed!');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

restoreAndFix(); 
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://zrgmktqkvnywsatxyfdt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUTCTimestamps() {
  try {
    console.log('🔧 Converting local time timestamps to proper UTC...');
    
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, name, created_at, last_modified');

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    for (const lead of leads) {
      console.log(`\n📝 Processing: ${lead.name}`);
      console.log(`   Current created_at: "${lead.created_at}"`);
      console.log(`   Current last_modified: "${lead.last_modified}"`);
      
      // The timestamps are currently being treated as BST (local time)
      // We need to convert them to UTC by subtracting 1 hour
      
      // Parse as local time and convert to UTC
      let createdUTC, modifiedUTC;
      
      if (!lead.created_at.includes('Z') && !lead.created_at.includes('+')) {
        // Parse as local time, then convert to UTC
        const createdLocal = new Date(lead.created_at);
        createdUTC = new Date(createdLocal.getTime() - (60 * 60 * 1000)); // Subtract 1 hour for BST
        console.log(`   Converting created_at from BST to UTC: ${createdUTC.toISOString()}`);
      } else {
        createdUTC = new Date(lead.created_at);
      }
      
      if (!lead.last_modified.includes('Z') && !lead.last_modified.includes('+')) {
        // Parse as local time, then convert to UTC  
        const modifiedLocal = new Date(lead.last_modified);
        modifiedUTC = new Date(modifiedLocal.getTime() - (60 * 60 * 1000)); // Subtract 1 hour for BST
        console.log(`   Converting last_modified from BST to UTC: ${modifiedUTC.toISOString()}`);
      } else {
        modifiedUTC = new Date(lead.last_modified);
      }

      // Update with proper UTC timestamps
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          created_at: createdUTC.toISOString(),
          last_modified: modifiedUTC.toISOString()
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error(`❌ Error updating ${lead.name}:`, updateError);
      } else {
        console.log(`✅ Updated ${lead.name} with proper UTC timestamps`);
        
        // Test the result
        console.log(`   Result: Created will show as ${createdUTC.toLocaleString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Europe/London'
        })}`);
        console.log(`   Result: Modified will show as ${modifiedUTC.toLocaleString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Europe/London'
        })}`);
      }
    }

    console.log('\n🎉 UTC timestamp conversion completed!');
    console.log('Now your frontend should show the correct UK times!');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixUTCTimestamps(); 
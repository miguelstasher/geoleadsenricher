const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zrgmktqkvnywsatxyfdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo'
);

async function addLocationColumn() {
  console.log('Adding location column to leads table...');
  
  try {
    // Note: The anon key might not have permission to alter tables
    // You may need to run this SQL directly in the Supabase dashboard
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE leads ADD COLUMN IF NOT EXISTS location TEXT'
    });
    
    if (error) {
      console.error('Error (expected with anon key):', error.message);
      console.log('\n📝 MANUAL STEPS:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Open your project: zrgmktqkvnywsatxyfdt');
      console.log('3. Go to SQL Editor');
      console.log('4. Run this SQL:');
      console.log('   ALTER TABLE leads ADD COLUMN location TEXT;');
      console.log('5. Then come back and run this script again to test');
    } else {
      console.log('✅ Location column added successfully!');
    }
  } catch (err) {
    console.error('Error:', err.message);
    console.log('\n📝 MANUAL STEPS:');
    console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
    console.log('2. Open your project: zrgmktqkvnywsatxyfdt');
    console.log('3. Go to SQL Editor');
    console.log('4. Run this SQL:');
    console.log('   ALTER TABLE leads ADD COLUMN location TEXT;');
    console.log('5. Then come back and test the updated scraper');
  }
  
  // Test if location column exists by trying to select it
  console.log('\nTesting if location column exists...');
  try {
    const { data: testData, error: testError } = await supabase
      .from('leads')
      .select('id, name, location')
      .limit(1);
      
    if (testError) {
      if (testError.message.includes('location')) {
        console.log('❌ Location column does not exist yet');
      } else {
        console.log('❌ Other error:', testError.message);
      }
    } else {
      console.log('✅ Location column exists and is accessible!');
      if (testData && testData.length > 0) {
        console.log('Sample data:', testData[0]);
      }
    }
  } catch (err) {
    console.log('❌ Error testing column:', err.message);
  }
}

addLocationColumn().catch(console.error); 
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zrgmktqkvnywsatxyfdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo'
);

async function testLocationColumn() {
  console.log('=== TESTING LOCATION COLUMN ===\n');
  
  // Test if location column exists
  try {
    const { data: testData, error: testError } = await supabase
      .from('leads')
      .select('id, name, location, city')
      .limit(1);
      
    if (testError) {
      if (testError.message.includes('location')) {
        console.log('❌ Location column still does not exist');
        console.log('Please run the SQL in Supabase dashboard first:');
        console.log('ALTER TABLE leads ADD COLUMN location TEXT;');
        return;
      } else {
        console.log('❌ Other error:', testError.message);
        return;
      }
    } else {
      console.log('✅ Location column exists and is accessible!');
      if (testData && testData.length > 0) {
        console.log('Sample existing data:', testData[0]);
      }
    }
  } catch (err) {
    console.log('❌ Error testing column:', err.message);
    return;
  }
  
  // Create a test search to verify the full flow works
  console.log('\n=== CREATING TEST SEARCH ===');
  
  const { data: newSearch, error: insertError } = await supabase
    .from('search_history')
    .insert([{
      search_method: 'coordinates',
      coordinates: '51.5074, -0.1278', // Central London
      radius: 100, // Small radius for quick test
      categories: ['restaurant'],  // Single category for testing
      currency: '£',
      created_by: 'Test User',
      status: 'pending'
    }])
    .select()
    .single();

  if (insertError) {
    console.error('Error creating test search:', insertError);
    return;
  }

  console.log(`✅ Created test search: ${newSearch.id}`);

  // Trigger the scraping API
  console.log('🚀 Starting scraping process...');
  
  const response = await fetch('http://localhost:3000/api/scrape-google-maps', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      searchId: newSearch.id
    })
  });

  const result = await response.json();
  console.log('API Response:', result);

  if (result.success) {
    console.log('\n⏳ Waiting 15 seconds for processing...');
    
    setTimeout(async () => {
      // Check the search status
      const { data: updatedSearch } = await supabase
        .from('search_history')
        .select('*')
        .eq('id', newSearch.id)
        .single();
        
      console.log(`\n📊 Search Status: ${updatedSearch.status}`);
      console.log(`📊 Processed: ${updatedSearch.processed_count}/${updatedSearch.total_results}`);
      
      // Check if leads were created with location data
      const { data: newLeads } = await supabase
        .from('leads')
        .select('name, location, city, business_type, source')
        .eq('source', 'Google Maps API')
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (newLeads && newLeads.length > 0) {
        console.log('\n✅ SUCCESS! New leads with location data:');
        newLeads.forEach(lead => {
          console.log(`- ${lead.name} (${lead.business_type})`);
          console.log(`  📍 Location: ${lead.location}`);
          console.log(`  🏙️  City: ${lead.city}`);
          console.log('');
        });
      } else {
        console.log('\n❌ No new leads created yet. Check for errors in the scraping process.');
      }
      
      // Total count
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact' });
        
      console.log(`📈 Total leads in database: ${totalLeads}`);
      
    }, 15000);
  }
}

testLocationColumn().catch(console.error); 
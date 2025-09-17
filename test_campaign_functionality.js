// Test script to verify campaign functionality
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testCampaignFunctionality() {
  console.log('🧪 Testing Campaign Functionality...\n');

  // Test 1: Check if settings table exists and has API keys
  console.log('1. Testing API Keys Configuration...');
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'api_keys')
      .single();

    if (error) {
      console.log('❌ Settings table error:', error.message);
    } else if (settings) {
      const apiKeys = JSON.parse(settings.value);
      console.log('✅ API Keys found:', {
        instantly: apiKeys.instantly ? 'Configured' : 'Missing',
        hunter: apiKeys.hunter ? 'Configured' : 'Missing',
        snov: apiKeys.snov ? 'Configured' : 'Missing',
        googleMaps: apiKeys.googleMaps ? 'Configured' : 'Missing'
      });
    } else {
      console.log('⚠️ No API keys found in settings table');
    }
  } catch (error) {
    console.log('❌ Error checking API keys:', error.message);
  }

  // Test 2: Check campaigns table structure
  console.log('\n2. Testing Campaigns Table Structure...');
  try {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Campaigns table error:', error.message);
    } else {
      console.log('✅ Campaigns table accessible');
      if (campaigns && campaigns.length > 0) {
        const sample = campaigns[0];
        console.log('📋 Sample campaign structure:', {
          hasId: !!sample.id,
          hasName: !!sample.name,
          hasInstantlyId: !!sample.instantly_id,
          hasStatus: !!sample.status,
          hasCreatedAt: !!sample.created_at
        });
      } else {
        console.log('📋 No campaigns found in table');
      }
    }
  } catch (error) {
    console.log('❌ Error checking campaigns table:', error.message);
  }

  // Test 3: Check leads table structure
  console.log('\n3. Testing Leads Table Structure...');
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, name, email, campaign, campaign_status')
      .limit(1);

    if (error) {
      console.log('❌ Leads table error:', error.message);
    } else {
      console.log('✅ Leads table accessible');
      if (leads && leads.length > 0) {
        const sample = leads[0];
        console.log('📋 Sample lead structure:', {
          hasId: !!sample.id,
          hasName: !!sample.name,
          hasEmail: !!sample.email,
          hasCampaign: !!sample.campaign,
          hasCampaignStatus: !!sample.campaign_status
        });
      } else {
        console.log('📋 No leads found in table');
      }
    }
  } catch (error) {
    console.log('❌ Error checking leads table:', error.message);
  }

  // Test 4: Test Instantly API connection
  console.log('\n4. Testing Instantly API Connection...');
  try {
    const apiKey = 'PNcaUGkSra0wdz3b6NEM3p7zzqj3S';
    const response = await fetch(`https://api.instantly.ai/api/v1/campaign/list?api_key=${apiKey}&skip=0&limit=1`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Instantly API connection successful');
      console.log(`📊 Found ${Array.isArray(data) ? data.length : 0} campaigns in Instantly`);
    } else {
      console.log('❌ Instantly API error:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error connecting to Instantly API:', error.message);
  }

  console.log('\n🎯 Test completed!');
}

// Run the test
testCampaignFunctionality().catch(console.error);

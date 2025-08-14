const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ktvynwffbbfwafqmlbce.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnlud2ZmYmJmd2FmcW1sYmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNjI1NTAsImV4cCI6MjA0OTkzODU1MH0.wnpZJQpovgPttbXCy3Aw1ZlrQJVSqrUgpC_7K5PBdBc'
);

// Mock localStorage for chain entries (same as in settings)
const mockChainEntries = [
  { name: 'Hilton', domain: 'hilton.com' },
  { name: 'Marriott', domain: 'marriott.com' },
  { name: 'Best Western', domain: 'bestwestern.com' },
  { name: 'Holiday Inn', domain: 'holidayinn.com' },
  { name: 'Premier Inn', domain: 'premierinn.com' },
  { name: 'Travelodge', domain: 'travelodge.co.uk' },
  { name: 'McDonald\'s', domain: 'mcdonalds.com' },
  { name: 'Subway', domain: 'subway.com' },
  { name: 'Costa Coffee', domain: 'costa.co.uk' },
  { name: 'Starbucks', domain: 'starbucks.com' }
];

// Same detectChainStatus function as in the app
function detectChainStatus(website, chainEntries) {
  if (!website || !chainEntries) return false;
  
  const cleanWebsite = website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  
  return chainEntries.some(chain => {
    const chainDomain = chain.domain.toLowerCase();
    return cleanWebsite.includes(chainDomain) || chainDomain.includes(cleanWebsite);
  });
}

async function debugChainDetection() {
  try {
    console.log('=== CHAIN DETECTION DEBUG ===\n');
    
    // Get all leads
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, name, website, chain')
      .limit(50);

    if (error) throw error;
    
    console.log(`Total leads in database: ${leads.length}\n`);
    
    // Test chain detection
    let chainCount = 0;
    let detectedChains = [];
    
    leads.forEach(lead => {
      const isChain = detectChainStatus(lead.website, mockChainEntries);
      if (isChain) {
        chainCount++;
        detectedChains.push({
          name: lead.name,
          website: lead.website,
          dbChainField: lead.chain
        });
      }
    });
    
    console.log(`Leads detected as chains: ${chainCount}`);
    console.log('\nDetailed chain detections:');
    detectedChains.forEach(chain => {
      console.log(`- ${chain.name}: ${chain.website} (DB chain field: ${chain.dbChainField})`);
    });
    
    console.log('\nChain entries being used for detection:');
    mockChainEntries.forEach(entry => {
      console.log(`- ${entry.name}: ${entry.domain}`);
    });
    
    // Test a few specific websites
    console.log('\nTest specific websites:');
    const testWebsites = leads.slice(0, 5).map(lead => lead.website);
    testWebsites.forEach(website => {
      const isChain = detectChainStatus(website, mockChainEntries);
      console.log(`${website} -> Chain: ${isChain}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugChainDetection(); 
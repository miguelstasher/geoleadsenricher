// Test script for complete email enrichment process
import { enrichLeadEmail } from './src/utils/emailEnrichment.js';

async function testEnrichmentProcess() {
  console.log('🧪 Testing Complete Email Enrichment Process...\n');
  
  const testLeads = [
    {
      id: '1',
      name: 'The Counting House',
      website: 'https://www.the-counting-house.com',
      email: '',
      email_status: ''
    },
    {
      id: '2', 
      name: 'Test Business',
      website: 'https://www.example.com',
      email: '',
      email_status: ''
    }
  ];
  
  for (const lead of testLeads) {
    console.log(`\n🔍 Testing enrichment for: ${lead.name}`);
    console.log(`🌐 Website: ${lead.website}`);
    
    try {
      const result = await enrichLeadEmail(lead);
      
      console.log(`📧 Result:`, {
        email: result.email,
        status: result.email_status,
        source: result.source,
        confidence: result.confidence_score
      });
      
      if (result.email && result.email !== 'not_found' && result.email !== 'No email found') {
        console.log(`✅ SUCCESS: Found email ${result.email} via ${result.source}`);
      } else {
        console.log(`❌ No email found via any source`);
      }
      
    } catch (error) {
      console.error(`❌ Error enriching ${lead.name}:`, error.message);
    }
    
    console.log('─'.repeat(60));
  }
}

// Run the test
testEnrichmentProcess().catch(console.error);

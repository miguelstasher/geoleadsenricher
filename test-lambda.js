// Test script for Lambda email enrichment
// Using built-in fetch (available in Node.js 18+)

async function testLambdaEnrichment() {
  console.log('🧪 Testing Lambda Email Enrichment...\n');
  
  const testWebsites = [
    'https://www.the-counting-house.com',
    'https://www.apple.com',
    'https://www.example.com'
  ];
  
  const lambdaUrl = 'https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper';
  const authToken = 'b24be261-f07b-4adf-a33c-cf87084b889b';
  
  for (const website of testWebsites) {
    console.log(`🔍 Testing: ${website}`);
    
    try {
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken
        },
        body: JSON.stringify({ website })
      });
      
      console.log(`📡 Response Status: ${response.status}`);
      
      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} - ${response.statusText}`);
        continue;
      }
      
      const responseData = await response.json();
      console.log(`📦 Raw Response:`, JSON.stringify(responseData, null, 2));
      
      // Parse the body if it's a string (Lambda API Gateway format)
      let data;
      if (responseData.body && typeof responseData.body === 'string') {
        try {
          data = JSON.parse(responseData.body);
          console.log(`🔍 Parsed Body:`, JSON.stringify(data, null, 2));
        } catch (parseError) {
          console.error(`❌ Parse Error:`, parseError);
          data = responseData;
        }
      } else {
        data = responseData;
      }
      
      // Check for email
      if (data.email && data.email !== 'No email found' && data.email !== 'not_found') {
        console.log(`✅ Found Email: ${data.email}`);
      } else {
        console.log(`❌ No Email Found`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${website}:`, error.message);
    }
    
    console.log('─'.repeat(50));
  }
}

// Run the test
testLambdaEnrichment().catch(console.error);

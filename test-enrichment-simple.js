// Simple test for Lambda integration
async function testLambdaIntegration() {
  console.log('🧪 Testing Lambda Integration in Enrichment Process...\n');
  
  const testWebsite = 'https://www.the-counting-house.com';
  const lambdaUrl = 'https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper';
  const authToken = 'b24be261-f07b-4adf-a33c-cf87084b889b';
  
  console.log(`🔍 Testing Lambda for: ${testWebsite}`);
  
  try {
    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken
      },
      body: JSON.stringify({ website: testWebsite })
    });
    
    console.log(`📡 Response Status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log(`📦 Raw Response:`, JSON.stringify(responseData, null, 2));
    
    // Test the parsing logic from our enrichment function
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
    
    // Test email validation logic
    let foundEmail = null;
    if (data.email) {
      const email = data.email.trim();
      const isValidEmail = email && 
                          email !== "No email found" && 
                          email !== "not_found" && 
                          !email.toLowerCase().includes("no email") &&
                          !email.toLowerCase().includes("not found") &&
                          email.includes("@");
      
      if (isValidEmail) {
        foundEmail = email;
        console.log(`✅ Valid email found: ${foundEmail}`);
      } else {
        console.log(`❌ Invalid email: "${email}"`);
      }
    } else {
      console.log(`❌ No email field in response`);
    }
    
    if (foundEmail) {
      console.log(`🎯 SUCCESS: Lambda enrichment would work for this website!`);
      console.log(`📧 Email: ${foundEmail}`);
    } else {
      console.log(`❌ Lambda enrichment would fail for this website`);
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
  }
}

// Run the test
testLambdaIntegration().catch(console.error);

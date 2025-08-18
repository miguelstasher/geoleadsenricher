// Email Enrichment Utility - Waterfall Approach
// Hunter.io → Snov.io → AWS Lambda → Verification

interface EmailEnrichmentResult {
  email: string | null;
  email_status: 'verified' | 'accept_all' | 'invalid' | 'unverified' | 'not_found';
  source: 'hunter.io' | 'snov.io' | 'aws_lambda' | 'none';
  confidence_score?: number;
  verification_details?: any;
}

interface Lead {
  id: string;
  name: string;
  website: string;
  email?: string;
  email_status?: string;
}

// Helper function to extract main domain from URL
function extractMainDomain(url: string): string {
  try {
    const hostname = url.replace(/https?:\/\//, '').split('/')[0];
    const parts = hostname.split('.');
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch (error) {
    console.error("Error extracting domain:", error);
    return url;
  }
}

// Sleep function for rate limiting
function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// 1. Hunter.io Email Search
async function searchEmailsHunter(website: string): Promise<EmailEnrichmentResult> {
  const domain = extractMainDomain(website);
  const hunterApiKey = process.env.HUNTER_API_KEY;
  
  if (!hunterApiKey || hunterApiKey === 'your_hunter_io_api_key' || hunterApiKey === 'your-hunter-api-key' || hunterApiKey === 'your-hunter-api-key-here') {
    throw new Error('❌ Hunter.io API key is required for email search. Get your API key from https://hunter.io/ and add it to HUNTER_API_KEY environment variable.');
  }

  const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${hunterApiKey}`;

  try {
    console.log(`🔄 Hunter.io searching: ${domain}`);
    
    const response = await fetch(hunterUrl);
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Hunter.io error: ${response.status} - ${responseText}`);
      throw new Error(`Hunter.io error: ${response.status}`);
    }

    const data = JSON.parse(responseText);
    
    // Extract email exactly like in your Airtable script
    const email1 = data.data?.emails?.length > 0 ? data.data.emails[0].value : null;
    
    if (email1 && email1 !== "No Email Found") {
      console.log(`✅ Hunter.io found email: ${email1}`);
      
      // Verify the email
      const verification = await verifyEmailHunter(email1);
      return {
        email: email1,
        email_status: verification.status,
        source: 'hunter.io',
        confidence_score: verification.score,
        verification_details: verification
      };
    }

    console.log(`❌ Hunter.io: No emails found for domain: ${domain}`);
    return {
      email: null,
      email_status: 'not_found',
      source: 'hunter.io'
    };

  } catch (error: any) {
    console.error('Hunter.io search error:', error);
    throw error;
  }
}

// 2. Hunter.io Email Verification
async function verifyEmailHunter(email: string): Promise<{status: 'verified' | 'accept_all' | 'invalid' | 'unverified', score: number}> {
  const hunterApiKey = process.env.HUNTER_API_KEY;
  
  if (!hunterApiKey || hunterApiKey === 'your-hunter-api-key' || hunterApiKey === 'your-hunter-api-key-here') {
    throw new Error('❌ Hunter.io API key is required for email verification. Get your API key from https://hunter.io/ and add it to HUNTER_API_KEY environment variable.');
  }
  
  const verifyUrl = `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${hunterApiKey}`;

  try {
    const response = await fetch(verifyUrl);
    const data = await response.json();

    if (!response.ok) {
      console.log(`⚠️  Hunter.io verification failed for ${email}: ${response.status} - using unverified status`);
      return { status: 'unverified', score: 50 };
    }

    const result = data.data?.result;
    const score = data.data?.score || 0;

    console.log(`🔍 Hunter.io verification for ${email}: result=${result}, score=${score}`);

    // Map Hunter.io results to our status system with score-based logic
    // Use 82% confidence threshold: >=82% = valid, <82% = invalid
    if (score >= 82) {
      // High confidence (82%+) = valid regardless of result type
      return { status: 'verified', score };
    } else {
      // Low confidence (<82%) = invalid regardless of result type
      return { status: 'invalid', score };
    }

  } catch (error: any) {
    console.error('Hunter.io verification error:', error);
    return { status: 'unverified', score: 0 };
  }
}

// 3. Snov.io Email Search (exact implementation from your Airtable script)
async function searchEmailsSnov(website: string): Promise<EmailEnrichmentResult> {
  const domain = extractMainDomain(website);
  
  // Snov.io API credentials from your script
  const API_USER_ID = process.env.SNOV_API_USER_ID || '9d6ecb9c93134a23a9fd4a052072783c';
  const API_SECRET = process.env.SNOV_API_SECRET || '45aeaed702300aca97ff732a14e53132';
  
  if (!API_USER_ID || !API_SECRET) {
    throw new Error('❌ Snov.io API credentials are required. Configure SNOV_API_USER_ID and SNOV_API_SECRET environment variables.');
  }

  async function getAccessToken() {
    try {
      const response = await fetch('https://api.snov.io/v1/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: API_USER_ID,
          client_secret: API_SECRET
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Snov.io Access Token Response:', JSON.stringify(data, null, 2));
      
      if (!data.access_token) {
        throw new Error('No access token in response');
      }

      return data.access_token;
    } catch (error) {
      console.error('Error getting Snov.io access token:', error);
      throw error;
    }
  }

  async function getDomainEmails(accessToken: string, domain: string) {
    try {
      const params = new URLSearchParams({
        access_token: accessToken,
        domain: domain,
        type: 'all',
        limit: '1',
        lastId: '0'
      });

      const url = `https://api.snov.io/v2/domain-emails-with-info?${params}`;
      console.log('Snov.io API Request URL:', url);

      const response = await fetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Snov.io API Response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Error getting domain emails from Snov.io:', error);
      throw error;
    }
  }

  try {
    console.log(`🔄 Snov.io searching: ${domain}`);
    
    const accessToken = await getAccessToken();
    console.log('Snov.io Access Token:', accessToken);

    const emailData = await getDomainEmails(accessToken, domain);

    let email = null;
    if (emailData.emails && emailData.emails.length > 0) {
      email = emailData.emails[0].email;
      console.log(`✅ Snov.io found email: ${email}`);
    } else {
      console.log('❌ Snov.io: No emails found in API response');
    }

    if (email && email !== "Unknown") {
      // Verify the email with Hunter.io
      const verification = await verifyEmailHunter(email);
      return {
        email: email,
        email_status: verification.status,
        source: 'snov.io',
        confidence_score: verification.score,
        verification_details: verification
      };
    }

    console.log(`❌ Snov.io: No emails found for domain: ${domain}`);
    return {
      email: null,
      email_status: 'not_found',
      source: 'snov.io'
    };

  } catch (error: any) {
    console.error('Snov.io search error:', error);
    throw error;
  }
}

// 4. AWS Lambda Email Scraper
async function searchEmailsAWSLambda(website: string, businessName: string): Promise<EmailEnrichmentResult> {
  // Use the working Lambda URL from your Airtable script
  const lambdaUrl = process.env.AWS_LAMBDA_EMAIL_SCRAPER_URL || 'https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper';
  const authToken = process.env.AWS_LAMBDA_AUTH_TOKEN || 'b24be261-f07b-4adf-a33c-cf87084b889b';
  
  if (!lambdaUrl || lambdaUrl === 'https://replace-with-your-lambda-url') {
    console.log('⚠️  AWS Lambda URL not configured, skipping...');
    return {
      email: null,
      email_status: 'not_found',
      source: 'aws_lambda'
    };
  }

  try {
    console.log(`🔄 AWS Lambda scraping: ${website}`);
    
    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken
      },
      body: JSON.stringify({
        website: website
      })
    });

    if (!response.ok) {
      console.error(`❌ AWS Lambda HTTP error: ${response.status} - ${response.statusText}`);
      throw new Error(`AWS Lambda HTTP error: ${response.status}`);
    }

    const responseData = await response.json();
    console.log(`🔍 AWS Lambda raw response:`, JSON.stringify(responseData, null, 2));
    
    // Parse the body if it's a string (Lambda API Gateway format)
    let data;
    if (responseData.body && typeof responseData.body === 'string') {
      try {
        data = JSON.parse(responseData.body);
        console.log(`🔍 Parsed Lambda body:`, JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error(`❌ Failed to parse Lambda body:`, parseError);
        data = responseData; // Fallback to original response
      }
    } else {
      data = responseData; // Direct response format
    }
    
    // Handle both formats: new format has single 'email' field, old format has 'emails' array
    let foundEmail = null;
    
    console.log(`🔍 AWS Lambda response data:`, JSON.stringify(data));
    
    // Check single email field (new format)
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
        console.log(`✅ Valid email found in data.email: ${foundEmail}`);
      } else {
        console.log(`❌ Invalid email in data.email: "${email}" - continuing to next step`);
      }
    }
    
    // Check emails array (old format) 
    else if (data.emails && data.emails.length > 0) {
      const email = data.emails[0].trim();
      const isValidEmail = email && 
                          email !== "No email found" && 
                          email !== "not_found" && 
                          !email.toLowerCase().includes("no email") &&
                          !email.toLowerCase().includes("not found") &&
                          email.includes("@");
      
      if (isValidEmail) {
        foundEmail = email;
        console.log(`✅ Valid email found in data.emails[0]: ${foundEmail}`);
      } else {
        console.log(`❌ Invalid email in data.emails[0]: "${email}" - continuing to next step`);
      }
    } else {
      console.log(`❌ No email field found in Lambda response - continuing to next step`);
    }
    
    if (foundEmail) {
      console.log(`✅ AWS Lambda found email: ${foundEmail} for website: ${website}`);
      
      // Verify the email
      const verification = await verifyEmailHunter(foundEmail);
      return {
        email: foundEmail,
        email_status: verification.status,
        source: 'aws_lambda',
        confidence_score: verification.score,
        verification_details: verification
      };
    }

    console.log(`❌ AWS Lambda: No emails found for website: ${website}`);
    return {
      email: null,
      email_status: 'not_found',
      source: 'aws_lambda'
    };

  } catch (error: any) {
    console.error('AWS Lambda search error:', error);
    throw error;
  }
}

// 5. Main Waterfall Function
export async function enrichLeadEmail(lead: Lead): Promise<EmailEnrichmentResult> {
  console.log(`\n🚀 Starting email enrichment for: ${lead.name} (${lead.website})`);
  
  // Skip if email already exists
  if (lead.email && lead.email.trim() !== '' && lead.email !== 'Not Found') {
    console.log(`⏭️  Email already exists: ${lead.email}`);
    return {
      email: lead.email,
      email_status: lead.email_status as any || 'unverified',
      source: 'none'
    };
  }

  // Skip if no website
  if (!lead.website || lead.website.trim() === '') {
    console.log(`❌ No website provided for: ${lead.name}`);
    return {
      email: 'not_found',
      email_status: 'not_found',
      source: 'none'
    };
  }

  // Step 1: Try AWS Lambda Scraper (Primary)
  try {
    console.log(`1️⃣ Trying AWS Lambda for: ${lead.website}`);
    const lambdaResult = await searchEmailsAWSLambda(lead.website, lead.name);
    if (lambdaResult.email && lambdaResult.email !== 'not_found' && lambdaResult.email !== 'No email found') {
      console.log(`✅ Success with AWS Lambda: ${lambdaResult.email}`);
      return lambdaResult;
    } else {
      console.log(`⚠️  AWS Lambda found no email for: ${lead.website}`);
    }
  } catch (error: any) {
    console.error(`❌ AWS Lambda failed for ${lead.website}:`, error.message);
    console.error(`Full error:`, error);
  }
  await sleep(1000); // Rate limiting

  // Step 2: Try Hunter.io (Secondary)
  try {
    console.log(`2️⃣ Trying Hunter.io for: ${lead.website}`);
    const hunterResult = await searchEmailsHunter(lead.website);
    if (hunterResult.email) {
      console.log(`✅ Success with Hunter.io: ${hunterResult.email}`);
      return hunterResult;
    }
  } catch (error: any) {
    console.log(`⚠️  Hunter.io failed: ${error.message}`);
  }
  await sleep(1000); // Rate limiting

  // Step 3: Try Snov.io (Tertiary)
  try {
    console.log(`3️⃣ Trying Snov.io for: ${lead.website}`);
    const snovResult = await searchEmailsSnov(lead.website);
    if (snovResult.email) {
      console.log(`✅ Success with Snov.io: ${snovResult.email}`);
      return snovResult;
    }
  } catch (error: any) {
    console.log(`⚠️  Snov.io failed: ${error.message}`);
  }

  // No email found anywhere
  console.log(`❌ No email found for: ${lead.name} after trying all sources`);
  return {
    email: 'not_found',
    email_status: 'not_found',
    source: 'none'
  };
}

// 6. Batch Processing Function with Parallel Processing
export async function enrichLeadsBatch(leads: Lead[], onProgress?: (progress: {completed: number, total: number, currentLead: string}) => void, concurrency: number = 5): Promise<EmailEnrichmentResult[]> {
  const results: EmailEnrichmentResult[] = new Array(leads.length);
  
  console.log(`\n🎯 Starting parallel batch enrichment for ${leads.length} leads with concurrency: ${concurrency}`);
  
  // Process leads in batches for parallel execution
  for (let i = 0; i < leads.length; i += concurrency) {
    const batch = leads.slice(i, i + concurrency);
    const batchPromises = batch.map(async (lead, batchIndex) => {
      const leadIndex = i + batchIndex;
      
      try {
        const result = await enrichLeadEmail(lead);
        
        // Update progress
        if (onProgress) {
          onProgress({
            completed: leadIndex + 1,
            total: leads.length,
            currentLead: lead.name
          });
        }
        
        return { index: leadIndex, result };
      } catch (error: any) {
        console.error(`❌ Failed to enrich lead ${lead.name}:`, error);
        return { 
          index: leadIndex, 
          result: {
            email: 'Not Found',
            email_status: 'not_found' as const,
            source: 'none' as const
          }
        };
      }
    });
    
    // Wait for current batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Store results in correct order
    batchResults.forEach(({ index, result }) => {
      results[index] = result;
    });
    
    // Small delay between batches to avoid overwhelming APIs
    if (i + concurrency < leads.length) {
      await sleep(500); // Reduced from 2000ms to 500ms
    }
  }
  
  // Final progress update
  if (onProgress) {
    onProgress({
      completed: leads.length,
      total: leads.length,
      currentLead: 'Completed'
    });
  }
  
  console.log(`\n✅ Parallel batch enrichment completed: ${results.length} leads processed`);
  return results;
}

// 7. Fast Parallel Processing (Maximum Speed)
export async function enrichLeadsFast(leads: Lead[], onProgress?: (progress: {completed: number, total: number, currentLead: string}) => void): Promise<EmailEnrichmentResult[]> {
  const results: EmailEnrichmentResult[] = new Array(leads.length);
  
  console.log(`\n⚡ Starting ultra-fast enrichment for ${leads.length} leads`);
  
  // Process all leads in parallel with minimal delays
  const promises = leads.map(async (lead, index) => {
    try {
      // Reduced sleep times for faster processing
      const result = await enrichLeadEmailFast(lead);
      
      // Update progress
      if (onProgress) {
        onProgress({
          completed: index + 1,
          total: leads.length,
          currentLead: lead.name
        });
      }
      
      return { index, result };
    } catch (error: any) {
      console.error(`❌ Failed to enrich lead ${lead.name}:`, error);
      return { 
        index, 
        result: {
          email: 'Not Found',
          email_status: 'not_found' as const,
          source: 'none' as const
        }
      };
    }
  });
  
  // Wait for all leads to complete
  const allResults = await Promise.all(promises);
  
  // Store results in correct order
  allResults.forEach(({ index, result }) => {
    results[index] = result;
  });
  
  // Final progress update
  if (onProgress) {
    onProgress({
      completed: leads.length,
      total: leads.length,
      currentLead: 'Completed'
    });
  }
  
  console.log(`\n⚡ Ultra-fast enrichment completed: ${results.length} leads processed`);
  return results;
}

// 8. Fast Enrichment Function (Reduced Delays)
async function enrichLeadEmailFast(lead: Lead): Promise<EmailEnrichmentResult> {
  console.log(`⚡ Fast enrichment for: ${lead.name} (${lead.website})`);

  // Step 1: Try AWS Lambda Scraper (Primary) - No delay
  try {
    console.log(`1️⃣ Trying AWS Lambda for: ${lead.website}`);
    const lambdaResult = await searchEmailsAWSLambda(lead.website, lead.name);
    if (lambdaResult.email) {
      console.log(`✅ Success with AWS Lambda: ${lambdaResult.email}`);
      return lambdaResult;
    }
  } catch (error: any) {
    console.log(`⚠️  AWS Lambda failed: ${error.message}`);
  }
  await sleep(200); // Reduced from 1000ms to 200ms

  // Step 2: Try Hunter.io (Secondary) - Reduced delay
  try {
    console.log(`2️⃣ Trying Hunter.io for: ${lead.website}`);
    const hunterResult = await searchEmailsHunter(lead.website);
    if (hunterResult.email) {
      console.log(`✅ Success with Hunter.io: ${hunterResult.email}`);
      return hunterResult;
    }
  } catch (error: any) {
    console.log(`⚠️  Hunter.io failed: ${error.message}`);
  }
  await sleep(200); // Reduced from 1000ms to 200ms

  // Step 3: Try Snov.io (Tertiary) - Reduced delay
  try {
    console.log(`3️⃣ Trying Snov.io for: ${lead.website}`);
    const snovResult = await searchEmailsSnov(lead.website);
    if (snovResult.email) {
      console.log(`✅ Success with Snov.io: ${snovResult.email}`);
      return snovResult;
    }
  } catch (error: any) {
    console.log(`⚠️  Snov.io failed: ${error.message}`);
  }

  // No email found anywhere
  console.log(`❌ No email found for: ${lead.name} after trying all sources`);
  return {
    email: 'not_found',
    email_status: 'not_found',
    source: 'none'
  };
} 
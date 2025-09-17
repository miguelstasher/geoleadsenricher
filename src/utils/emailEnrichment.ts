// Email Enrichment Utility - Waterfall Approach
// Hunter.io → Snov.io → AWS Lambda → Verification

interface EmailEnrichmentResult {
  email: string | null;
  email_status: 'Valid' | 'Invalid' | 'Unverified' | 'not_found';
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(hunterUrl, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Hunter.io error: ${response.status} - ${responseText}`);
      throw new Error(`Hunter.io error: ${response.status}`);
    }

    const data = JSON.parse(responseText);
    
    // Extract email exactly like in your Airtable script
    const email1 = data.data?.emails?.length > 0 ? data.data.emails[0].value : null;
    
    if (email1 && email1 !== "No Email Found") {
      // Verify the email with timeout
      try {
        const verification = await verifyEmailHunter(email1);
        return {
          email: email1,
          email_status: verification.status,
          source: 'hunter.io',
          confidence_score: verification.score,
          verification_details: verification
        };
      } catch (error) {
        // If verification fails, try a direct verification call
        console.log(`⚠️  Hunter.io verification failed for ${email1}, trying direct verification...`);
        try {
          const directVerification = await verifyEmailHunter(email1);
          return {
            email: email1,
            email_status: directVerification.status,
            source: 'hunter.io',
            confidence_score: directVerification.score
          };
        } catch (directError) {
          console.log(`❌ Direct verification also failed for ${email1}`);
          return {
            email: email1,
            email_status: 'Unverified',
            source: 'hunter.io'
          };
        }
      }
    }

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
async function verifyEmailHunter(email: string): Promise<{status: 'Valid' | 'Invalid' | 'Unverified', score: number}> {
  const hunterApiKey = process.env.HUNTER_API_KEY;
  
  if (!hunterApiKey || hunterApiKey === 'your-hunter-api-key' || hunterApiKey === 'your-hunter-api-key-here') {
    throw new Error('❌ Hunter.io API key is required for email verification. Get your API key from https://hunter.io/ and add it to HUNTER_API_KEY environment variable.');
  }
  
  const verifyUrl = `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${hunterApiKey}`;

  try {
    const response = await fetch(verifyUrl);
    const data = await response.json();

    if (!response.ok) {
      console.log(`⚠️  Hunter.io verification failed for ${email}: ${response.status} - using Unverified status`);
      return { status: 'Unverified', score: 50 };
    }

    const result = data.data?.result;
    const score = data.data?.score || 0;

    // Map Hunter.io results to our status system with score-based logic
    // Use 80% confidence threshold: >=80% = Valid, <80% = Invalid
    if (score >= 80) {
      // High confidence (80%+) = Valid regardless of result type
      return { status: 'Valid', score };
    } else {
      // Low confidence (<80%) = Invalid regardless of result type
      return { status: 'Invalid', score };
    }

  } catch (error: any) {
    console.error('Hunter.io verification error:', error);
    return { status: 'Unverified', score: 0 };
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const accessToken = await getAccessToken();
    const emailData = await getDomainEmails(accessToken, domain);
    
    clearTimeout(timeoutId);

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

// 3. AWS Lambda Email Scraper (Primary Source)
async function searchEmailsAWSLambda(website: string, businessName: string): Promise<EmailEnrichmentResult> {
  try {
    console.log(`🔄 AWS Lambda scraping: ${website}`);
    
    const lambdaUrl = process.env.AWS_LAMBDA_EMAIL_SCRAPER_URL;
    const authToken = process.env.AWS_LAMBDA_AUTH_TOKEN;
    
    if (!lambdaUrl || !authToken) {
      throw new Error('AWS Lambda configuration missing');
    }

    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken
      },
      body: JSON.stringify({
        website: website,
        businessName: businessName
      }),
      // Faster timeout for better performance
      signal: AbortSignal.timeout(8000) // 8 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`Lambda API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    // Parse the body if it's a string (Lambda API Gateway format)
    let data;
    if (responseData.body && typeof responseData.body === 'string') {
      try {
        data = JSON.parse(responseData.body);
      } catch (parseError) {
        data = responseData; // Fallback to original response
      }
    } else {
      data = responseData; // Direct response format
    }

    // Check if we got a valid email
    if (data && data.email && 
        data.email !== 'not_found' && 
        data.email !== 'No email found' && 
        data.email !== 'Unknown' &&
        !data.email.toLowerCase().includes('no email') &&
        !data.email.toLowerCase().includes('not found') &&
        !data.email.toLowerCase().includes('unknown') &&
        data.email.includes('@')) {
      
      // Verify the email with Hunter.io
      try {
        const verificationResult = await verifyEmailHunter(data.email);
        
        return {
          email: data.email,
          email_status: verificationResult.status,
          source: 'aws_lambda'
        };
      } catch (verificationError) {
        // Return the email anyway, but mark as unverified status
        return {
          email: data.email,
          email_status: 'Unverified',
          source: 'aws_lambda'
        };
      }
    } else {
      return {
        email: 'not_found',
        email_status: 'not_found',
        source: 'aws_lambda'
      };
    }
  } catch (error: any) {
    console.error(`❌ AWS Lambda scraping failed for ${website}:`, error.message);
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
      email_status: lead.email_status as any || 'Unverified',
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

// 6. Optimized Batch Processing Function (Ultra-Fast Mode)
export async function enrichLeadsBatch(leads: Lead[], onProgress?: (progress: {completed: number, total: number, currentLead: string}) => void): Promise<EmailEnrichmentResult[]> {
  const results: EmailEnrichmentResult[] = new Array(leads.length);
  
  console.log(`\n⚡ Starting ultra-fast enrichment for ${leads.length} leads`);
  
  // Process leads in parallel batches for maximum speed
  const concurrency = 15; // Process 15 leads simultaneously for maximum speed
  
  for (let i = 0; i < leads.length; i += concurrency) {
    const batch = leads.slice(i, i + concurrency);
    const batchPromises = batch.map(async (lead, batchIndex) => {
      const leadIndex = i + batchIndex;
      
      try {
        const result = await enrichLeadEmailOptimized(lead);
        
        // Update progress immediately when each lead completes
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
        
        // Update progress even on failure
        if (onProgress) {
          onProgress({
            completed: leadIndex + 1,
            total: leads.length,
            currentLead: lead.name
          });
        }
        
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
    
    // No delay between batches for maximum speed
  }
  
  console.log(`\n⚡ Ultra-fast enrichment completed: ${results.length} leads processed`);
  return results;
}

// 7. Function to re-verify emails marked as "Unverified"
async function reVerifyUnverifiedEmail(email: string): Promise<{status: 'Valid' | 'Invalid' | 'Unverified', score: number}> {
  try {
    console.log(`🔄 Re-verifying email: ${email}`);
    const verification = await verifyEmailHunter(email);
    console.log(`✅ Re-verification result for ${email}: ${verification.status} (${verification.score}%)`);
    return verification;
  } catch (error) {
    console.log(`❌ Re-verification failed for ${email}`);
    return { status: 'Unverified', score: 0 };
  }
}

// 8. Optimized Enrichment Function (Ultra-Fast but Quality-Focused)
async function enrichLeadEmailOptimized(lead: Lead): Promise<EmailEnrichmentResult> {
  // Skip if no website
  if (!lead.website || lead.website.trim() === '') {
    return {
      email: 'not_found',
      email_status: 'not_found',
      source: 'none'
    };
  }

  // Try all three methods in parallel with timeouts for maximum speed
  const timeout = 8000; // 8 second timeout per method
  
  try {
    // Run all three methods in parallel with timeouts
    const [lambdaResult, hunterResult, snovResult] = await Promise.allSettled([
      searchEmailsAWSLambda(lead.website, lead.name),
      searchEmailsHunter(lead.website),
      searchEmailsSnov(lead.website)
    ]);

    // Check results in order of preference (Lambda > Hunter > Snov)
    if (lambdaResult.status === 'fulfilled' && 
        lambdaResult.value.email && 
        lambdaResult.value.email !== 'not_found' && 
        lambdaResult.value.email !== 'No email found') {
      return lambdaResult.value;
    }
    
    if (hunterResult.status === 'fulfilled' && 
        hunterResult.value.email && 
        hunterResult.value.email !== 'not_found') {
      // If the email is marked as "Unverified", try to re-verify it
      if (hunterResult.value.email_status === 'Unverified') {
        console.log(`🔄 Re-verifying Hunter.io found email: ${hunterResult.value.email}`);
        const reVerification = await reVerifyUnverifiedEmail(hunterResult.value.email);
        return {
          ...hunterResult.value,
          email_status: reVerification.status,
          confidence_score: reVerification.score
        };
      }
      return hunterResult.value;
    }
    
    if (snovResult.status === 'fulfilled' && 
        snovResult.value.email && 
        snovResult.value.email !== 'not_found') {
      // If the email is marked as "Unverified", try to re-verify it
      if (snovResult.value.email_status === 'Unverified') {
        console.log(`🔄 Re-verifying Snov.io found email: ${snovResult.value.email}`);
        const reVerification = await reVerifyUnverifiedEmail(snovResult.value.email);
        return {
          ...snovResult.value,
          email_status: reVerification.status,
          confidence_score: reVerification.score
        };
      }
      return snovResult.value;
    }

  } catch (error: any) {
    // If parallel execution fails, fall back to sequential
    try {
      const lambdaResult = await searchEmailsAWSLambda(lead.website, lead.name);
      if (lambdaResult.email && lambdaResult.email !== 'not_found' && lambdaResult.email !== 'No email found') {
        return lambdaResult;
      }
    } catch (error: any) {
      // Continue to next method
    }
    
    try {
      const hunterResult = await searchEmailsHunter(lead.website);
      if (hunterResult.email) {
        return hunterResult;
      }
    } catch (error: any) {
      // Continue to next method
    }
    
    try {
      const snovResult = await searchEmailsSnov(lead.website);
      if (snovResult.email) {
        return snovResult;
      }
    } catch (error: any) {
      // Continue to next method
    }
  }

  // No email found anywhere
  return {
    email: 'not_found',
    email_status: 'not_found',
    source: 'none'
  };
} 
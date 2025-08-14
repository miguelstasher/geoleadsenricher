// Optimized Email Enrichment Utility - Parallel Processing with Reduced Delays
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

// Reduced sleep function for faster processing
function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// 1. Hunter.io Email Search (Optimized)
async function searchEmailsHunter(website: string): Promise<EmailEnrichmentResult> {
  const domain = extractMainDomain(website);
  const hunterApiKey = process.env.HUNTER_API_KEY;
  
  if (!hunterApiKey) {
    throw new Error('❌ Hunter.io API key is required');
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

// 2. Hunter.io Email Verification (Optimized)
async function verifyEmailHunter(email: string): Promise<{status: 'verified' | 'accept_all' | 'invalid' | 'unverified', score: number}> {
  const hunterApiKey = process.env.HUNTER_API_KEY;
  
  if (!hunterApiKey) {
    throw new Error('❌ Hunter.io API key is required');
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
    if (score >= 82) {
      return { status: 'verified', score };
    } else {
      return { status: 'invalid', score };
    }

  } catch (error: any) {
    console.error('Hunter.io verification error:', error);
    return { status: 'unverified', score: 0 };
  }
}

// 3. Snov.io Email Search (Optimized)
async function searchEmailsSnov(website: string): Promise<EmailEnrichmentResult> {
  const domain = extractMainDomain(website);
  
  const API_USER_ID = process.env.SNOV_API_USER_ID || '9d6ecb9c93134a23a9fd4a052072783c';
  const API_SECRET = process.env.SNOV_API_SECRET || '45aeaed702300aca97ff732a14e53132';
  
  if (!API_USER_ID || !API_SECRET) {
    throw new Error('❌ Snov.io API credentials are required');
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

      const response = await fetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        const email = data.data[0].email;
        console.log(`✅ Snov.io found email: ${email}`);
        return email;
      } else {
        console.log(`❌ Snov.io: No emails found for domain: ${domain}`);
        return null;
      }
    } catch (error) {
      console.error('Error getting domain emails from Snov.io:', error);
      throw error;
    }
  }

  try {
    console.log(`🔄 Snov.io searching: ${domain}`);
    
    const accessToken = await getAccessToken();
    const email = await getDomainEmails(accessToken, domain);
    
    if (email) {
      return {
        email: email,
        email_status: 'unverified', // Snov.io doesn't provide verification
        source: 'snov.io'
      };
    }

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

// 4. AWS Lambda Email Scraper (Optimized)
async function searchEmailsAWSLambda(website: string, businessName: string): Promise<EmailEnrichmentResult> {
  const lambdaUrl = process.env.AWS_LAMBDA_EMAIL_SCRAPER_URL || 'https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper';
  const authToken = process.env.AWS_LAMBDA_AUTH_TOKEN || 'b24be261-f07b-4adf-a33c-cf87084b889b';

  try {
    console.log(`🔄 AWS Lambda searching: ${website}`);
    
    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        website: website,
        business_name: businessName
      })
    });

    if (!response.ok) {
      throw new Error(`AWS Lambda error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.email && data.email !== 'No email found' && data.email !== 'Unknown') {
      console.log(`✅ AWS Lambda found email: ${data.email}`);
      return {
        email: data.email,
        email_status: 'unverified', // AWS Lambda doesn't provide verification
        source: 'aws_lambda'
      };
    }

    console.log(`❌ AWS Lambda: No email found for: ${website}`);
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

// 5. Optimized Email Enrichment with Reliable Fallback
export async function enrichLeadEmailOptimized(lead: Lead): Promise<EmailEnrichmentResult> {
  console.log(`\n🎯 Starting optimized enrichment for: ${lead.name} (${lead.website})`);

  // If lead already has a verified email, skip enrichment
  if (lead.email && lead.email_status === 'verified') {
    console.log(`✅ Lead already has verified email: ${lead.email}`);
    return {
      email: lead.email,
      email_status: 'verified',
      source: 'existing'
    };
  }

  // Step 1: Try AWS Lambda Scraper (Primary) - Fastest
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
  await sleep(300); // Reduced delay

  // Step 2: Try Hunter.io (Secondary) - Most reliable
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
  await sleep(300); // Reduced delay

  // Step 3: Try Snov.io (Tertiary) - Backup
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

// 6. Optimized Batch Processing with Concurrency Control
export async function enrichLeadsBatchOptimized(
  leads: Lead[], 
  onProgress?: (progress: {completed: number, total: number, currentLead: string}) => void,
  concurrency: number = 2 // Process 2 leads simultaneously for reliability
): Promise<EmailEnrichmentResult[]> {
  const results: EmailEnrichmentResult[] = [];
  
  console.log(`\n🎯 Starting optimized batch enrichment for ${leads.length} leads (concurrency: ${concurrency})`);
  
  // Process leads in batches for controlled concurrency
  for (let i = 0; i < leads.length; i += concurrency) {
    const batch = leads.slice(i, i + concurrency);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (lead, batchIndex) => {
      const leadIndex = i + batchIndex;
      
      // Update progress
      if (onProgress) {
        onProgress({
          completed: leadIndex,
          total: leads.length,
          currentLead: lead.name
        });
      }

      try {
        const result = await enrichLeadEmailOptimized(lead);
        return { index: leadIndex, result };
      } catch (error: any) {
        console.error(`❌ Failed to enrich lead ${lead.name}:`, error);
        return { 
          index: leadIndex, 
          result: {
            email: 'Not Found',
            email_status: 'not_found',
            source: 'none'
          }
        };
      }
    });

    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Add results in correct order
    batchResults.forEach(({ index, result }) => {
      results[index] = result;
    });

    // Conservative delay between batches for reliability
    if (i + concurrency < leads.length) {
      await sleep(800);
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
  
  console.log(`\n✅ Optimized batch enrichment completed: ${results.length} leads processed`);
  return results;
}

// 7. Ultra-Fast Batch Processing (Maximum Speed)
export async function enrichLeadsBatchUltraFast(
  leads: Lead[], 
  onProgress?: (progress: {completed: number, total: number, currentLead: string}) => void,
  concurrency: number = 3 // Process 3 leads simultaneously for balance
): Promise<EmailEnrichmentResult[]> {
  const results: EmailEnrichmentResult[] = [];
  
  console.log(`\n🚀 Starting ultra-fast batch enrichment for ${leads.length} leads (concurrency: ${concurrency})`);
  
  // Process all leads in parallel with controlled concurrency
  const promises = leads.map(async (lead, index) => {
    // Update progress
    if (onProgress) {
      onProgress({
        completed: index,
        total: leads.length,
        currentLead: lead.name
      });
    }

    try {
      const result = await enrichLeadEmailOptimized(lead);
      return { index, result };
    } catch (error: any) {
      console.error(`❌ Failed to enrich lead ${lead.name}:`, error);
      return { 
        index, 
        result: {
          email: 'Not Found',
          email_status: 'not_found',
          source: 'none'
        }
      };
    }
  });

  // Use Promise.allSettled to handle all promises with concurrency control
  const settledResults = await Promise.allSettled(promises);
  
  // Process results
  settledResults.forEach((settled, index) => {
    if (settled.status === 'fulfilled') {
      results[settled.value.index] = settled.value.result;
    } else {
      results[index] = {
        email: 'Not Found',
        email_status: 'not_found',
        source: 'none'
      };
    }
  });
  
  // Final progress update
  if (onProgress) {
    onProgress({
      completed: leads.length,
      total: leads.length,
      currentLead: 'Completed'
    });
  }
  
  console.log(`\n🚀 Ultra-fast batch enrichment completed: ${results.length} leads processed`);
  return results;
}

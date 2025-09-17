import axios from 'axios';

// Helper function to sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to verify email with Hunter.io
async function verifyEmailWithHunter(email: string): Promise<{status: string, score: number}> {
  try {
    console.log(`  🔍 Verifying email with Hunter.io: ${email}`);
    
    const response = await axios.get(
      `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${process.env.HUNTER_API_KEY}`,
      { timeout: 10000 }
    );

    if (response.data && response.data.data) {
      const result = response.data.data;
      const score = result.score || 0;
      
      // Determine status based on confidence score
      if (score >= 80) {
        return { status: 'Valid', score };
      } else if (score >= 50) {
        return { status: 'Unverified', score };
      } else {
        return { status: 'Invalid', score };
      }
    }
    
    return { status: 'Unverified', score: 0 };
  } catch (error) {
    console.error(`  ❌ Hunter.io verification failed for ${email}:`, error);
    return { status: 'Unverified', score: 0 };
  }
}

// Sequential waterfall email enrichment function (Lambda → Hunter → Snov)
export async function enrichLeadEmailOptimized(lead: any): Promise<any> {
  const { name, website } = lead;
  
  if (!website || !name) {
    return { ...lead, email: 'not_found', email_status: 'not_found' };
  }

  console.log(`🔍 Enriching email for: ${name} (${website})`);

  try {
    // Step 1: Try AWS Lambda scraper first (most reliable)
    console.log(`  📡 Step 1: Trying AWS Lambda scraper...`);
    const lambdaResult = await tryAWSLambdaScraper(website, name);
    if (lambdaResult && lambdaResult.email && lambdaResult.email !== 'not_found') {
      console.log(`  ✅ AWS Lambda found: ${lambdaResult.email}`);
      // Verify the email with Hunter.io
      const verifiedResult = await verifyEmailWithHunter(lambdaResult.email);
      return { 
        ...lead, 
        email: lambdaResult.email, 
        email_status: verifiedResult.status,
        confidence_score: verifiedResult.score
      };
    }

    // Step 2: Try Hunter.io (only if Lambda failed)
    console.log(`  📡 Step 2: Trying Hunter.io...`);
    await sleep(2000); // Wait 2 seconds between APIs
    const hunterResult = await tryHunterIO(website, name);
    if (hunterResult && hunterResult.email && hunterResult.email !== 'not_found') {
      console.log(`  ✅ Hunter.io found: ${hunterResult.email}`);
      // Hunter.io already provides verification, but double-check
      const verifiedResult = await verifyEmailWithHunter(hunterResult.email);
      return { 
        ...lead, 
        email: hunterResult.email, 
        email_status: verifiedResult.status,
        confidence_score: verifiedResult.score
      };
    }

    // Step 3: Try Snov.io (only if Lambda and Hunter failed)
    console.log(`  📡 Step 3: Trying Snov.io...`);
    await sleep(2000); // Wait 2 seconds between APIs
    const snovResult = await trySnovIO(website, name);
    if (snovResult && snovResult.email && snovResult.email !== 'not_found') {
      console.log(`  ✅ Snov.io found: ${snovResult.email}`);
      // Verify the email with Hunter.io
      const verifiedResult = await verifyEmailWithHunter(snovResult.email);
      return { 
        ...lead, 
        email: snovResult.email, 
        email_status: verifiedResult.status,
        confidence_score: verifiedResult.score
      };
    }

    console.log(`  ❌ No email found after trying all 3 methods`);
    return { ...lead, email: 'not_found', email_status: 'not_found' };

  } catch (error) {
    console.error(`  ❌ Error enriching ${name}:`, error);
    return { ...lead, email: 'not_found', email_status: 'error' };
  }
}

// AWS Lambda scraper function - UPDATED TO MATCH AIRTABLE SCRIPT
async function tryAWSLambdaScraper(website: string, name: string): Promise<any> {
  try {
    console.log(`  🔗 Calling AWS Lambda for: ${website}`);
    
    const response = await axios.post(
      process.env.AWS_LAMBDA_EMAIL_SCRAPER_URL!,
      {
        website: website
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.AWS_LAMBDA_AUTH_TOKEN!
        },
        timeout: 30000
      }
    );

    console.log(`  📥 AWS Lambda response:`, response.data);

    // Check for valid email (matching Airtable script logic)
    if (response.data && response.data.email && 
        response.data.email !== "No email found" && 
        !response.data.email.includes('Error')) {
      console.log(`  ✅ AWS Lambda found email: ${response.data.email}`);
      return { email: response.data.email, email_status: 'verified' };
    }

    console.log(`  ❌ AWS Lambda: No valid email found`);
    return null;
  } catch (error) {
    console.error('AWS Lambda error:', error);
    return null;
  }
}

// Hunter.io API function
async function tryHunterIO(website: string, name: string): Promise<any> {
  try {
    const cleanWebsite = website.replace(/^https?:\/\//, '').replace(/^www\./, '');
    const response = await axios.get(
      `https://api.hunter.io/v2/domain-search?domain=${cleanWebsite}&api_key=${process.env.HUNTER_API_KEY}`,
      { timeout: 15000 }
    );

    if (response.data && response.data.data && response.data.data.emails) {
      const emails = response.data.data.emails;
      if (emails.length > 0) {
        // Try to find email matching the name
        const nameMatch = emails.find((email: any) => 
          email.value && email.value.toLowerCase().includes(name.toLowerCase().split(' ')[0])
        );
        if (nameMatch) {
          return { email: nameMatch.value, email_status: 'verified' };
        }
        // Return first email if no name match
        return { email: emails[0].value, email_status: 'verified' };
      }
    }
    return null;
  } catch (error) {
    console.error('Hunter.io error:', error);
    return null;
  }
}

// Snov.io API function
async function trySnovIO(website: string, name: string): Promise<any> {
  try {
    const cleanWebsite = website.replace(/^https?:\/\//, '').replace(/^www\./, '');
    const response = await axios.get(
      `https://api.snov.io/v1/get-domain-emails-with-info?domain=${cleanWebsite}&type=all&limit=10&access_token=${process.env.SNOV_API_SECRET}`,
      { timeout: 15000 }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      const emails = response.data.data;
      // Try to find email matching the name
      const nameMatch = emails.find((email: any) => 
        email.email && email.email.toLowerCase().includes(name.toLowerCase().split(' ')[0])
      );
      if (nameMatch) {
        return { email: nameMatch.email, email_status: 'verified' };
      }
      // Return first email if no name match
      return { email: emails[0].email, email_status: 'verified' };
    }
    return null;
  } catch (error) {
    console.error('Snov.io error:', error);
    return null;
  }
}

// Original working batch enrichment - SLOW BUT RELIABLE
export async function enrichLeadsBatchOptimized(
  leads: any[], 
  onProgress?: (progress: { completed: number; total: number; currentLead: string }) => void,
  batchSize: number = 1 // Process one at a time for reliability
): Promise<any[]> {
  const results: any[] = [];
  let completed = 0;

  console.log(`🚀 Starting batch enrichment for ${leads.length} leads with batch size ${batchSize}`);

  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    
    for (const lead of batch) {
      console.log(`\n📋 Processing lead ${completed + 1}/${leads.length}: ${lead.name}`);
      
      // Update progress
      if (onProgress) {
        onProgress({
          completed,
          total: leads.length,
          currentLead: lead.name
        });
      }

      // Enrich the lead
      const result = await enrichLeadEmailOptimized(lead);
      results.push(result);
      completed++;

      // Wait between leads to avoid rate limiting - ORIGINAL SLOWER VERSION
      if (completed < leads.length) {
        console.log(`  ⏳ Waiting 5 seconds before next lead...`);
        await sleep(5000); // 5 second delay like the original
      }
    }
  }

  console.log(`✅ Batch enrichment completed: ${results.length} leads processed`);
  return results;
}

// Ultra-fast batch enrichment (for when speed is priority)
export async function enrichLeadsBatchUltraFast(
  leads: any[], 
  onProgress?: (progress: { completed: number; total: number; currentLead: string }) => void,
  batchSize: number = 2
): Promise<any[]> {
  const results: any[] = [];
  let completed = 0;

  console.log(`🚀 Starting ultra-fast batch enrichment for ${leads.length} leads`);

  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (lead) => {
      console.log(`📋 Processing lead: ${lead.name}`);
      
      // Update progress
      if (onProgress) {
        onProgress({
          completed,
          total: leads.length,
          currentLead: lead.name
        });
      }

      const result = await enrichLeadEmailOptimized(lead);
      completed++;
      return result;
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    // Add successful results
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Batch enrichment error:', result.reason);
        results.push({ email: 'not_found', email_status: 'error' });
      }
    });

    // Wait between batches
    if (i + batchSize < leads.length) {
      await sleep(1000);
    }
  }

  console.log(`✅ Ultra-fast batch enrichment completed: ${results.length} leads processed`);
  return results;
}


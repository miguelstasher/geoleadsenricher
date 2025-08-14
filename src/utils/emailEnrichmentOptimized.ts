import axios from 'axios';

// Email enrichment function using multiple APIs with proper delays
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
      return { ...lead, email: lambdaResult.email, email_status: 'verified' };
    }

    // Step 2: Try Hunter.io
    console.log(`  📡 Step 2: Trying Hunter.io...`);
    await sleep(1000); // Wait 1 second between APIs
    const hunterResult = await tryHunterIO(website, name);
    if (hunterResult && hunterResult.email && hunterResult.email !== 'not_found') {
      console.log(`  ✅ Hunter.io found: ${hunterResult.email}`);
      return { ...lead, email: hunterResult.email, email_status: 'verified' };
    }

    // Step 3: Try Snov.io
    console.log(`  📡 Step 3: Trying Snov.io...`);
    await sleep(1000); // Wait 1 second between APIs
    const snovResult = await trySnovIO(website, name);
    if (snovResult && snovResult.email && snovResult.email !== 'not_found') {
      console.log(`  ✅ Snov.io found: ${snovResult.email}`);
      return { ...lead, email: snovResult.email, email_status: 'verified' };
    }

    console.log(`  ❌ No email found after trying all 3 methods`);
    return { ...lead, email: 'not_found', email_status: 'not_found' };

  } catch (error) {
    console.error(`  ❌ Error enriching ${name}:`, error);
    return { ...lead, email: 'not_found', email_status: 'error' };
  }
}

// AWS Lambda scraper function
async function tryAWSLambdaScraper(website: string, name: string): Promise<any> {
  try {
    const response = await axios.post(
      process.env.AWS_LAMBDA_EMAIL_SCRAPER_URL!,
      {
        website: website,
        name: name
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AWS_LAMBDA_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    if (response.data && response.data.email && response.data.email !== 'not_found') {
      return { email: response.data.email, email_status: 'verified' };
    }
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

// Batch enrichment with progress tracking
export async function enrichLeadsBatchOptimized(
  leads: any[], 
  onProgress?: (progress: { completed: number; total: number; currentLead: string }) => void,
  batchSize: number = 1 // Process one at a time for thoroughness
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

      // Wait between leads to avoid rate limiting
      if (completed < leads.length) {
        console.log(`  ⏳ Waiting 2 seconds before next lead...`);
        await sleep(2000);
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

// Utility function for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

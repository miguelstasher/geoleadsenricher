import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// SerpAPI key
const SERP_API_KEY = '3e12634045d6b5edd5cf314df831aaadebd1d7c5c4c5e4114ef3b4be35a75de8';

function convertNameToSearchQuery(businessName: string): string {
  // Convert "Roisa Hostal Boutique" to "Roisa+Hostal+Boutique+General+Manager+Linkedin"
  const cleanName = businessName
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, '+'); // Replace spaces with +
  
  return `${cleanName}+General+Manager+Linkedin`;
}

async function searchLinkedInProfile(businessName: string): Promise<string | null> {
  try {
    const searchQuery = convertNameToSearchQuery(businessName);
    const fullQuery = `${searchQuery} site:linkedin.com/in/ OR site:linkedin.com/pub/`;
    const encodedQuery = encodeURIComponent(fullQuery);
    
    const apiUrl = `https://serpapi.com/search.json?api_key=${SERP_API_KEY}&q=${encodedQuery}&num=10&gl=uk`;
    
    console.log('LinkedIn Search - API URL:', apiUrl);
    console.log('LinkedIn Search - Business Name:', businessName);
    console.log('LinkedIn Search - Search Query:', fullQuery);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    console.log('LinkedIn Search - API Response:', JSON.stringify(data, null, 2));
    
    // Find the first LinkedIn profile URL
    const firstResultUrl = data.organic_results && data.organic_results.length > 0 
      ? data.organic_results[0].link 
      : null;
    
    console.log('LinkedIn Search - First Result URL:', firstResultUrl);
    
    return firstResultUrl;
  } catch (error) {
    console.error('Error searching LinkedIn profile:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { leadIds } = await request.json();
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
    }
    
    console.log(`🎯 LinkedIn enrichment requested for ${leadIds.length} leads`);
    
    // Fetch the leads from database
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds);
    
    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }
    
    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads found' }, { status: 404 });
    }
    
    let processed = 0;
    let updated = 0;
    
    // Process each lead
    for (const lead of leads) {
      try {
        console.log(`🚀 Starting LinkedIn enrichment for: ${lead.name}`);
        
        if (!lead.name || lead.name.trim() === '') {
          console.log(`❌ No business name provided for lead ID: ${lead.id}`);
          processed++;
          continue;
        }
        
        // Skip if already has LinkedIn URL
        if (lead.linkedin_url && lead.linkedin_url.trim() !== '') {
          console.log(`⏭️ Lead ${lead.name} already has LinkedIn URL: ${lead.linkedin_url}`);
          processed++;
          continue;
        }
        
        // Search for LinkedIn profile
        const linkedInUrl = await searchLinkedInProfile(lead.name);
        
        if (linkedInUrl) {
          // Update the lead with LinkedIn URL
          const { error: updateError } = await supabase
            .from('leads')
            .update({ 
              linkedin_url: linkedInUrl,
              last_modified: new Date().toISOString()
            })
            .eq('id', lead.id);
          
          if (updateError) {
            console.error(`❌ Error updating lead ${lead.name}:`, updateError);
          } else {
            console.log(`✅ Updated ${lead.name} with LinkedIn URL: ${linkedInUrl}`);
            updated++;
          }
        } else {
          console.log(`❌ No LinkedIn profile found for: ${lead.name}`);
        }
        
        processed++;
        
        // Add a small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing lead ${lead.name}:`, error);
        processed++;
      }
    }
    
    console.log(`✅ LinkedIn enrichment completed: ${processed} leads processed, ${updated} LinkedIn URLs found`);
    
    return NextResponse.json({
      message: 'LinkedIn enrichment completed',
      processed,
      updated,
      total: leadIds.length
    });
    
  } catch (error) {
    console.error('❌ LinkedIn enrichment error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich LinkedIn URLs' },
      { status: 500 }
    );
  }
} 
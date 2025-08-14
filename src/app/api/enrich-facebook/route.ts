import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// SerpAPI key
const SERP_API_KEY = '3e12634045d6b5edd5cf314df831aaadebd1d7c5c4c5e4114ef3b4be35a75de8';

function convertNameToSearchQuery(businessName: string): string {
  // Convert "Roisa Hostal Boutique" to "Roisa+Hostal+Boutique+Facebook"
  const cleanName = businessName
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, '+'); // Replace spaces with +
  
  return `${cleanName}+Facebook`;
}

function isFacebookUrl(url: string): boolean {
  return url.includes('facebook.com/') && 
         !url.includes('facebook.com/search') && 
         !url.includes('facebook.com/login') &&
         !url.includes('facebook.com/help') &&
         !url.includes('facebook.com/privacy') &&
         !url.includes('facebook.com/terms');
}

async function searchFacebookPage(businessName: string): Promise<string | null> {
  try {
    const searchQuery = convertNameToSearchQuery(businessName);
    const encodedQuery = encodeURIComponent(searchQuery);
    
    const apiUrl = `https://serpapi.com/search.json?api_key=${SERP_API_KEY}&q=${encodedQuery}&num=10&gl=us`;
    
    console.log('Facebook Search - API URL:', apiUrl);
    console.log('Facebook Search - Business Name:', businessName);
    console.log('Facebook Search - Search Query:', searchQuery);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    console.log('Facebook Search - API Response:', JSON.stringify(data, null, 2));
    
    // Find the first Facebook URL
    let facebookUrl = null;
    if (data.organic_results) {
      for (let item of data.organic_results) {
        if (isFacebookUrl(item.link)) {
          facebookUrl = item.link;
          break;
        }
      }
    }
    
    console.log('Facebook Search - Found Facebook URL:', facebookUrl);
    
    // Log all Facebook URLs found for debugging
    if (data.organic_results) {
      console.log('Facebook Search - All Facebook URLs found:');
      data.organic_results.forEach((item: any) => {
        if (isFacebookUrl(item.link)) {
          console.log(item.link);
        }
      });
    }
    
    return facebookUrl;
  } catch (error) {
    console.error('Error searching Facebook page:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { leadIds } = await request.json();
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
    }
    
    console.log(`🎯 Facebook enrichment requested for ${leadIds.length} leads`);
    
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
        console.log(`🚀 Starting Facebook enrichment for: ${lead.name}`);
        
        if (!lead.name || lead.name.trim() === '') {
          console.log(`❌ No business name provided for lead ID: ${lead.id}`);
          processed++;
          continue;
        }
        
        // Skip if already has Facebook URL
        if (lead.facebook_url && lead.facebook_url.trim() !== '') {
          console.log(`⏭️ Lead ${lead.name} already has Facebook URL: ${lead.facebook_url}`);
          processed++;
          continue;
        }
        
        // Search for Facebook page
        const facebookUrl = await searchFacebookPage(lead.name);
        
        if (facebookUrl) {
          // Update the lead with Facebook URL
          const { error: updateError } = await supabase
            .from('leads')
            .update({ 
              facebook_url: facebookUrl,
              last_modified: new Date().toISOString()
            })
            .eq('id', lead.id);
          
          if (updateError) {
            console.error(`❌ Error updating lead ${lead.name}:`, updateError);
          } else {
            console.log(`✅ Updated ${lead.name} with Facebook URL: ${facebookUrl}`);
            updated++;
          }
        } else {
          console.log(`❌ No Facebook page found for: ${lead.name}`);
        }
        
        processed++;
        
        // Add a small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing lead ${lead.name}:`, error);
        processed++;
      }
    }
    
    console.log(`✅ Facebook enrichment completed: ${processed} leads processed, ${updated} Facebook URLs found`);
    
    return NextResponse.json({
      message: 'Facebook enrichment completed',
      processed,
      updated,
      total: leadIds.length
    });
    
  } catch (error) {
    console.error('❌ Facebook enrichment error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich Facebook URLs' },
      { status: 500 }
    );
  }
} 
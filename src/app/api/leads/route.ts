import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // First fetch all leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Then fetch all campaigns to get their status
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('name, status');

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    // Create a map of campaign names to their status
    const campaignStatusMap = new Map();
    campaigns.forEach(campaign => {
      campaignStatusMap.set(campaign.name, campaign.status);
    });

    // Debug: Log the campaign status map
    console.log('Campaign Status Map:', Object.fromEntries(campaignStatusMap));

    // Transform the data to include campaign_status from the campaigns table
    const transformedLeads = leads.map(lead => {
      const campaignStatus = lead.campaign ? campaignStatusMap.get(lead.campaign) || 'Unknown' : 'Unknown';
      
      // Debug: Log specific leads with Pal-Murcia-Hotels campaign
      if (lead.campaign === 'Pal-Murcia-Hotels') {
        console.log('Lead with Pal-Murcia-Hotels:', {
          leadId: lead.id,
          campaign: lead.campaign,
          oldCampaignStatus: lead.campaign_status,
          newCampaignStatus: campaignStatus
        });
      }
      
      return {
        ...lead,
        campaign_status: campaignStatus
      };
    });

    return NextResponse.json(transformedLeads);
  } catch (error) {
    console.error('Error in leads API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

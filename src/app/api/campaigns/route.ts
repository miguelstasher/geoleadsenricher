import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Fetch campaigns from the campaigns table, ordered by creation date (oldest first)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: true }); // Changed to ascending to show oldest first

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('No campaigns found in database');
      return NextResponse.json([]);
    }

    // Get the actual count of leads assigned to each campaign, separated by status
    const campaignsWithCounts = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          // Count NEW contacts (recently assigned, not sent to Instantly yet)
          const { count: newCount, error: newError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign', campaign.name)
            .eq('campaign_status', 'new');

          // Count SENT contacts (already sent to Instantly)
          const { count: sentCount, error: sentError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign', campaign.name)
            .eq('campaign_status', 'sent');

          if (newError || sentError) {
            console.error(`Error counting leads for campaign ${campaign.name}:`, newError || sentError);
            return {
              ...campaign,
              newContacts: 0,
              contactsInCampaign: 0,
              totalContacts: 0,
              status: campaign.status || 'Unknown',
              instantly_id: campaign.instantly_id || null
            };
          }

          const totalContacts = (newCount || 0) + (sentCount || 0);

          return {
            ...campaign,
            newContacts: newCount || 0,
            contactsInCampaign: sentCount || 0,
            totalContacts: totalContacts,
            // Keep the old contactsCount for backward compatibility
            contactsCount: totalContacts,
            status: campaign.status || 'Unknown',
            instantly_id: campaign.instantly_id || null
          };
        } catch (error) {
          console.error(`Error processing campaign ${campaign.name}:`, error);
          return {
            ...campaign,
            newContacts: 0,
            contactsInCampaign: 0,
            totalContacts: 0,
            contactsCount: 0,
            status: campaign.status || 'Unknown',
            instantly_id: campaign.instantly_id || null
          };
        }
      })
    );

    console.log('Campaigns with new/sent contact counts:', campaignsWithCounts);
    
    // Log campaign status summary
    const liveCampaigns = campaignsWithCounts.filter(c => c.status === 'Live').length;
    const deletedCampaigns = campaignsWithCounts.filter(c => c.status === 'Deleted').length;
    const unknownCampaigns = campaignsWithCounts.filter(c => c.status === 'Unknown').length;
    
    console.log(`Campaign Status Summary: Live: ${liveCampaigns}, Deleted: ${deletedCampaigns}, Unknown: ${unknownCampaigns}, Total: ${campaignsWithCounts.length}`);
    
    return NextResponse.json(campaignsWithCounts);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
} 
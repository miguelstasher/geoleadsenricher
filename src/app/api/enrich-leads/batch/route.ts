import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enrichLeadsBatchOptimized } from '../../../../utils/emailEnrichmentOptimized';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { leadIds, batchSize = 2 } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Lead IDs are required' }, { status: 400 });
    }

    console.log(`🔄 Starting batch enrichment for ${leadIds.length} leads with batch size ${batchSize}`);

    // Get leads from database
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id, name, website, email, email_status')
      .in('id', leadIds);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads found' }, { status: 404 });
    }

    // Filter out leads that already have emails
    const leadsToEnrich = leads.filter(lead => 
      !lead.email || lead.email.trim() === '' || lead.email === 'Not Found' || lead.email === 'not_found'
    );

    console.log(`📊 Processing ${leadsToEnrich.length} leads out of ${leads.length} total`);

    // Process in small batches to avoid timeouts
    const results = await enrichLeadsBatchOptimized(leadsToEnrich, (progress) => {
      console.log(`📈 Progress: ${progress.completed}/${progress.total} - ${progress.currentLead}`);
    }, batchSize);

    // Update database with results
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < leadsToEnrich.length; i++) {
      const lead = leadsToEnrich[i];
      const result = results[i];

      if (result && result.email && 
          result.email !== 'not_found' && 
          result.email !== 'No email found' && 
          result.email !== 'Unknown' &&
          !result.email.toLowerCase().includes('no email') &&
          !result.email.toLowerCase().includes('not found') &&
          !result.email.toLowerCase().includes('unknown') &&
          result.email.includes('@')) {
        
        // Update lead with enriched email
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            email: result.email,
            email_status: result.email_status,
            last_modified: new Date().toISOString().slice(0, 16).replace('T', ' ')
          })
          .eq('id', lead.id);

        if (updateError) {
          console.error(`❌ Failed to update lead ${lead.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Updated lead ${lead.name} with email: ${result.email}`);
          updatedCount++;
        }
      } else if (result && result.email_status === 'not_found') {
        // Update lead with not_found status
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            email_status: 'not_found',
            last_modified: new Date().toISOString().slice(0, 16).replace('T', ' ')
          })
          .eq('id', lead.id);

        if (updateError) {
          console.error(`❌ Failed to update lead ${lead.id} status:`, updateError);
          errorCount++;
        } else {
          console.log(`📝 Updated lead ${lead.name} status: not_found`);
          updatedCount++;
        }
      }
    }

    console.log(`✅ Batch enrichment completed: ${updatedCount} updated, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `Enrichment completed for ${leadsToEnrich.length} leads`,
      results: {
        total: leadsToEnrich.length,
        updated: updatedCount,
        errors: errorCount,
        successfulEmails: results.filter(r => r.email && r.email !== 'not_found').length
      }
    });

  } catch (error: any) {
    console.error('Error in batch enrichment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

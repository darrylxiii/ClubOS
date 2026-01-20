import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { company_id, limit = 100, retry_failed = false } = await req.json();

    console.log(`[Batch Processor] Starting batch processing for ${company_id || 'all companies'}, limit: ${limit}, retry_failed: ${retry_failed}`);

    // Fetch unprocessed interactions
    let query = supabase
      .from('company_interactions')
      .select('id, company_id, interaction_type, interaction_date');

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    if (retry_failed) {
      query = query.eq('processing_status', 'failed');
    } else {
      query = query.or('processing_status.is.null,processing_status.eq.pending');
    }

    query = query.order('interaction_date', { ascending: false }).limit(limit);

    const { data: interactions, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!interactions || interactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No interactions to process',
          processed: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Batch Processor] Found ${interactions.length} interactions to process`);

    let processed = 0;
    let failed = 0;
    const errors = [];

    // Update all to processing
    await supabase
      .from('company_interactions')
      .update({ processing_status: 'processing' })
      .in('id', interactions.map(i => i.id));

    // Process in parallel batches of 10
    const batchSize = 10;
    for (let i = 0; i < interactions.length; i += batchSize) {
      const batch = interactions.slice(i, i + batchSize);
      
      console.log(`[Batch Processor] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(interactions.length / batchSize)}`);

      const batchResults = await Promise.allSettled(
        batch.map(async (interaction) => {
          try {
            const { error: insightError } = await supabase.functions.invoke(
              'extract-interaction-insights',
              { body: { interaction_id: interaction.id } }
            );

            if (insightError) throw insightError;

            // Mark as completed
            await supabase
              .from('company_interactions')
              .update({ 
                processing_status: 'completed',
                insights_extracted_at: new Date().toISOString()
              })
              .eq('id', interaction.id);

            return { success: true, id: interaction.id };
          } catch (error: any) {
            // Mark as failed and log error
            await supabase
              .from('company_interactions')
              .update({ processing_status: 'failed' })
              .eq('id', interaction.id);

            await supabase
              .from('intelligence_processing_errors')
              .upsert({
                entity_type: 'interaction',
                entity_id: interaction.id,
                function_name: 'extract-interaction-insights',
                error_message: error.message,
                error_details: { stack: error.stack },
                retry_count: retry_failed ? 1 : 0,
                last_retry_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'entity_type,entity_id',
                ignoreDuplicates: false
              });

            throw error;
          }
        })
      );

      // Count results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          processed++;
        } else {
          failed++;
          errors.push({
            interaction_id: batch[index].id,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
    }

    // Generate reports for all affected companies
    const companyIds = [...new Set(interactions.map(i => i.company_id))];
    console.log(`[Batch Processor] Generating reports for ${companyIds.length} companies`);

    for (const compId of companyIds) {
      try {
        await supabase.functions.invoke('generate-company-intelligence-report', {
          body: { company_id: compId, period_days: 90 }
        });
      } catch (error: any) {
        console.error(`[Batch Processor] Failed to generate report for company ${compId}:`, error);
        errors.push({
          company_id: compId,
          step: 'report_generation',
          error: error.message
        });
      }
    }

    console.log(`[Batch Processor] Completed: ${processed} processed, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch processing completed`,
        processed,
        failed,
        total: interactions.length,
        companies_updated: companyIds.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Batch Processor] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
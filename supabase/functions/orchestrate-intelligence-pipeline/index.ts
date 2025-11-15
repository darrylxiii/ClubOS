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
    
    const { company_id, force_refresh = false } = await req.json();

    if (!company_id) {
      throw new Error('company_id is required');
    }

    console.log(`[Pipeline Orchestrator] Starting for company: ${company_id}, force_refresh: ${force_refresh}`);

    const startTime = Date.now();
    const results = {
      company_id,
      steps: {
        stakeholder_influence: { status: 'pending', duration_ms: 0 },
        insight_extraction: { status: 'pending', duration_ms: 0, processed: 0, failed: 0 },
        report_generation: { status: 'pending', duration_ms: 0 },
      },
      total_duration_ms: 0,
      errors: [] as any[],
    };

    // Step 1: Calculate stakeholder influence scores
    try {
      const step1Start = Date.now();
      console.log('[Pipeline] Step 1: Calculating stakeholder influence...');
      
      const { data: influenceData, error: influenceError } = await supabase.functions.invoke(
        'calculate-stakeholder-influence',
        { body: { company_id } }
      );

      if (influenceError) throw influenceError;
      
      results.steps.stakeholder_influence.status = 'completed';
      results.steps.stakeholder_influence.duration_ms = Date.now() - step1Start;
      console.log(`[Pipeline] Step 1 completed in ${results.steps.stakeholder_influence.duration_ms}ms`);
    } catch (error: any) {
      console.error('[Pipeline] Step 1 failed:', error);
      results.steps.stakeholder_influence.status = 'failed';
      results.errors.push({ step: 'stakeholder_influence', error: error.message });
    }

    // Step 2: Extract insights from all interactions (parallel processing with retry support)
    try {
      const step2Start = Date.now();
      console.log('[Pipeline] Step 2: Extracting interaction insights...');

      // Fetch interactions that need processing (including failed ones for retry)
      const query = supabase
        .from('company_interactions')
        .select('id, processing_status, retry_count')
        .eq('company_id', company_id)
        .in('processing_status', ['pending', 'failed']);

      if (!force_refresh) {
        query.or('insights_extracted_at.is.null,processing_status.eq.failed');
      }

      const { data: interactions, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!interactions || interactions.length === 0) {
        console.log('[Pipeline] No interactions to process');
        results.steps.insight_extraction.status = 'skipped';
      } else {
        console.log(`[Pipeline] Processing ${interactions.length} interactions...`);
        
        // Update status to processing
        await supabase
          .from('company_interactions')
          .update({ processing_status: 'processing' })
          .in('id', interactions.map(i => i.id));

        // Process in batches of 5 for parallel processing
        const batchSize = 5;
        let processed = 0;
        let failed = 0;

        for (let i = 0; i < interactions.length; i += batchSize) {
          const batch = interactions.slice(i, i + batchSize);
          
        const batchPromises = batch.map(async (interaction: any) => {
            try {
              const retryCount = interaction.retry_count || 0;
              
              const { data: insightData, error: insightError } = await supabase.functions.invoke(
                'extract-interaction-insights',
                { body: { interaction_id: interaction.id } }
              );

              if (insightError) throw insightError;

              // Mark as completed
              await supabase
                .from('company_interactions')
                .update({ 
                  processing_status: 'completed',
                  insights_extracted_at: new Date().toISOString(),
                  retry_count: 0
                })
                .eq('id', interaction.id);

              processed++;
              return { success: true, id: interaction.id };
            } catch (error: any) {
              const retryCount = interaction.retry_count || 0;
              console.error(`[Pipeline] Failed to process interaction ${interaction.id} (retry ${retryCount}):`, error);
              
              // Mark as failed and increment retry count
              await supabase
                .from('company_interactions')
                .update({ 
                  processing_status: 'failed',
                  retry_count: retryCount + 1
                })
                .eq('id', interaction.id);

              // Log detailed error
              await supabase
                .from('intelligence_processing_errors')
                .insert({
                  entity_type: 'interaction',
                  entity_id: interaction.id,
                  function_name: 'extract-interaction-insights',
                  error_message: error.message || 'Unknown error',
                  error_details: { 
                    stack: error.stack,
                    retry_count: retryCount + 1,
                    timestamp: new Date().toISOString()
                  }
                });

              failed++;
              return { success: false, id: interaction.id, error: error.message, retry_count: retryCount + 1 };
            }
          });

          await Promise.all(batchPromises);
          console.log(`[Pipeline] Batch processed: ${Math.min(i + batchSize, interactions.length)}/${interactions.length}`);
        }

        results.steps.insight_extraction.status = failed === 0 ? 'completed' : 'partial';
        results.steps.insight_extraction.processed = processed;
        results.steps.insight_extraction.failed = failed;
        results.steps.insight_extraction.duration_ms = Date.now() - step2Start;
        
        console.log(`[Pipeline] Step 2 completed: ${processed} processed, ${failed} failed in ${results.steps.insight_extraction.duration_ms}ms`);
      }
    } catch (error: any) {
      console.error('[Pipeline] Step 2 failed:', error);
      results.steps.insight_extraction.status = 'failed';
      results.errors.push({ step: 'insight_extraction', error: error.message });
    }

    // Step 3: Generate intelligence report with AI recommendations
    try {
      const step3Start = Date.now();
      console.log('[Pipeline] Step 3: Generating intelligence report...');

      const { data: reportData, error: reportError } = await supabase.functions.invoke(
        'generate-company-intelligence-report',
        { body: { company_id, period_days: 90 } }
      );

      if (reportError) throw reportError;

      results.steps.report_generation.status = 'completed';
      results.steps.report_generation.duration_ms = Date.now() - step3Start;
      console.log(`[Pipeline] Step 3 completed in ${results.steps.report_generation.duration_ms}ms`);
    } catch (error: any) {
      console.error('[Pipeline] Step 3 failed:', error);
      results.steps.report_generation.status = 'failed';
      results.errors.push({ step: 'report_generation', error: error.message });
    }

    results.total_duration_ms = Date.now() - startTime;

    const success = results.errors.length === 0 || 
      (results.steps.insight_extraction.status === 'partial' && results.steps.report_generation.status === 'completed');

    console.log(`[Pipeline Orchestrator] ${success ? 'Completed' : 'Failed'} in ${results.total_duration_ms}ms`);

    return new Response(
      JSON.stringify({
        success,
        message: success 
          ? 'Intelligence pipeline completed successfully'
          : 'Intelligence pipeline completed with errors',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Pipeline Orchestrator] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
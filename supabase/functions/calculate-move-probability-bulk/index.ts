import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

interface BulkCalculationResult {
  total_candidates: number;
  processed: number;
  failed: number;
  updated: number;
  skipped: number;
  errors: Array<{ candidateId: string; error: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: publicCorsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batch_size = 50, tier_filter, force_recalculate = false } = await req.json().catch(() => ({}));

    console.log(`[calculate-move-probability-bulk] Starting bulk calculation. Batch size: ${batch_size}, Force: ${force_recalculate}`);

    // Get candidates that need calculation
    let query = supabase
      .from('candidate_profiles')
      .select('id, full_name, current_title, current_company, years_of_experience, talent_tier, move_probability, last_engagement_date, availability_status, engagement_score, industries')
      .eq('data_deletion_requested', false)
      .is('gdpr_consent', true);

    // Apply tier filter if specified
    if (tier_filter && tier_filter.length > 0) {
      query = query.in('talent_tier', tier_filter);
    }

    // Only recalculate those without move_probability unless forced
    if (!force_recalculate) {
      query = query.is('move_probability', null);
    }

    const { data: candidates, error: fetchError } = await query.limit(500);

    if (fetchError) {
      throw fetchError;
    }

    if (!candidates || candidates.length === 0) {
      console.log('[calculate-move-probability-bulk] No candidates need calculation');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No candidates need move probability calculation',
          result: {
            total_candidates: 0,
            processed: 0,
            failed: 0,
            updated: 0,
            skipped: 0,
            errors: []
          }
        }),
        { headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[calculate-move-probability-bulk] Found ${candidates.length} candidates to process`);

    const result: BulkCalculationResult = {
      total_candidates: candidates.length,
      processed: 0,
      failed: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Process in batches
    const batches = [];
    for (let i = 0; i < candidates.length; i += batch_size) {
      batches.push(candidates.slice(i, i + batch_size));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (candidate) => {
        try {
          // Call the individual move probability calculation function
          const { data, error } = await supabase.functions.invoke('calculate-move-probability', {
            body: { candidate_id: candidate.id }
          });

          if (error) {
            throw error;
          }

          if (data?.success) {
            result.updated++;
          } else {
            result.skipped++;
          }
          result.processed++;

        } catch (error) {
          result.failed++;
          result.processed++;
          result.errors.push({
            candidateId: candidate.id,
            error: error instanceof Error ? error.message : String(error)
          });
          console.error(`[calculate-move-probability-bulk] Error processing ${candidate.id}:`, error);
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      console.log(`[calculate-move-probability-bulk] Batch complete. Progress: ${result.processed}/${result.total_candidates}`);
    }

    console.log(`[calculate-move-probability-bulk] Complete. Updated: ${result.updated}, Failed: ${result.failed}, Skipped: ${result.skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${result.processed} candidates`,
        result
      }),
      { headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[calculate-move-probability-bulk] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

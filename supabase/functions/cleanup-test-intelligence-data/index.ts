import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[CLEANUP] Starting test data removal...');

    // Delete test interactions (cascade will handle related records)
    const { data: testInteractions, error: interactionError } = await supabase
      .from('company_interactions')
      .delete()
      .eq('is_test_data', true)
      .select();

    const interactionCount = testInteractions?.length || 0;
    console.log(`[CLEANUP] Deleted ${interactionCount} test interactions`);

    // Delete test stakeholders (cascade will handle related records)
    const { data: testStakeholders, error: stakeholderError } = await supabase
      .from('company_stakeholders')
      .delete()
      .eq('is_test_data', true)
      .select();

    const stakeholderCount = testStakeholders?.length || 0;
    console.log(`[CLEANUP] Deleted ${stakeholderCount} test stakeholders`);

    // Delete orphaned interaction insights
    const { data: orphanedInsights, error: insightsError } = await supabase
      .from('interaction_insights')
      .delete()
      .is('interaction_id', null)
      .select();

    const insightsCount = orphanedInsights?.length || 0;
    console.log(`[CLEANUP] Deleted ${insightsCount} orphaned insights`);

    // Delete orphaned ML features
    const { data: orphanedFeatures, error: featuresError } = await supabase
      .from('interaction_ml_features')
      .delete()
      .is('interaction_id', null)
      .select();

    const featuresCount = orphanedFeatures?.length || 0;
    console.log(`[CLEANUP] Deleted ${featuresCount} orphaned ML features`);

    console.log('[CLEANUP] Test data cleanup completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All test intelligence data removed successfully',
        deleted: {
          interactions: interactionCount,
          stakeholders: stakeholderCount,
          insights: insightsCount,
          ml_features: featuresCount,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[CLEANUP] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { batch_size = 10 } = await req.json();

    console.log(`Processing intelligence queue (batch size: ${batch_size})`);

    // Get pending items ordered by priority
    const { data: queueItems, error: fetchError } = await supabase
      .from('intelligence_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batch_size);

    if (fetchError) throw fetchError;
    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No items to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${queueItems.length} items to process`);

    let successCount = 0;
    let failCount = 0;

    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabase
          .from('intelligence_queue')
          .update({ status: 'processing', attempts: item.attempts + 1 })
          .eq('id', item.id);

        let result;

        // Route to appropriate processor
        switch (item.processing_type) {
          case 'generate_embedding': {
            const entityType = item.entity_type === 'candidate_profiles' ? 'candidate' : 'job';
            result = await supabase.functions.invoke('generate-embeddings', {
              body: {
                entity_type: entityType,
                entity_id: item.entity_id
              }
            });
            break;
          }

          case 'extract_insights': {
            result = await supabase.functions.invoke('extract-interaction-insights', {
              body: {
                interaction_id: item.entity_id
              }
            });
            break;
          }

          case 'update_training_label': {
            result = await supabase.functions.invoke('track-ml-outcome', {
              body: {
                application_id: item.entity_id
              }
            });
            break;
          }

          default:
            throw new Error(`Unknown processing type: ${item.processing_type}`);
        }

        if (result.error) {
          throw new Error(result.error.message);
        }

        // Mark as completed
        await supabase
          .from('intelligence_queue')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        successCount++;
        console.log(`✓ Processed ${item.processing_type} for ${item.entity_type}:${item.entity_id}`);

      } catch (error) {
        console.error(`✗ Failed ${item.processing_type}:`, error);
        
        // Mark as failed
        await supabase
          .from('intelligence_queue')
          .update({ 
            status: item.attempts + 1 >= 3 ? 'failed' : 'pending',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', item.id);

        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        processed: queueItems.length,
        success: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-intelligence-queue:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

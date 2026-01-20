import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Process Meeting Intelligence] Starting processing...');

    // Get pending processing tasks
    const { data: pendingTasks } = await supabase
      .from('meeting_intelligence_processing')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log('[Process Meeting Intelligence] No pending tasks');
      return new Response(
        JSON.stringify({ message: 'No pending tasks', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const task of pendingTasks) {
      console.log(`[Process Meeting Intelligence] Processing ${task.processing_type} for meeting ${task.meeting_id}`);

      // Mark as processing
      await supabase
        .from('meeting_intelligence_processing')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', task.id);

      try {
        let result;

        switch (task.processing_type) {
          case 'hiring_manager_patterns':
            result = await supabase.functions.invoke('extract-hiring-manager-patterns', {
              body: { meetingId: task.meeting_id }
            });
            break;

          case 'candidate_performance':
            result = await supabase.functions.invoke('extract-candidate-performance', {
              body: { meetingId: task.meeting_id }
            });
            break;

          case 'transcript_analysis':
            // Basic transcript analysis - mark as complete
            await supabase
              .from('meeting_intelligence_processing')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString()
              })
              .eq('id', task.id);
            break;

          default:
            throw new Error(`Unknown processing type: ${task.processing_type}`);
        }

        if (result?.error) {
          throw new Error(result.error.message);
        }

        results.push({
          task_id: task.id,
          type: task.processing_type,
          status: 'completed'
        });

      } catch (error: any) {
        console.error(`[Process Meeting Intelligence] Error processing task ${task.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('meeting_intelligence_processing')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', task.id);

        results.push({
          task_id: task.id,
          type: task.processing_type,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log('[Process Meeting Intelligence] Processed', results.length, 'tasks');

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Process Meeting Intelligence] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

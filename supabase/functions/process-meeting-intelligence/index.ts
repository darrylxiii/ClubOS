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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
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

          case 'transcript_analysis': {
            console.log(`[Process Meeting Intelligence] Generating embeddings for meeting ${task.meeting_id}`);

            // 1. Fetch recording data to embed
            // Using 'meeting_recordings' table directly if view has issues, or just use the view if we are sure
            const { data: recData, error: recError } = await supabase
              .from('meeting_recordings') // Using base table to be safe
              .select('id, user_id, transcript, ai_summary, created_at')
              .eq('meeting_id', task.meeting_id)
              .maybeSingle();

            if (recError) {
              console.error('Error fetching recording for embedding:', recError);
            } else if (recData && recData.transcript) {
              // 2. Prepare content for RAG
              // We combine summary and part of transcript to keep it searchable but concise
              const summary = recData.ai_summary?.executiveSummary || '';
              const actionItems = JSON.stringify(recData.ai_summary?.actionItems || []);
              const transcriptSnippet = recData.transcript.substring(0, 4000); // First 4k chars to fit in embedding context

              const textToEmbed = `Meeting Summary: ${summary}
Action Items: ${actionItems}
Transcript: ${transcriptSnippet}`.trim();

              if (textToEmbed) {
                // 3. Generate Embedding
                try {
                  const embeddingResp = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${lovableApiKey}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      model: 'text-embedding-3-small',
                      input: textToEmbed,
                    })
                  });

                  if (embeddingResp.ok) {
                    const embeddingData = await embeddingResp.json();
                    const vector = embeddingData.data[0].embedding;

                    // 4. Store in intelligence_embeddings
                    const { error: embedError } = await supabase
                      .from('intelligence_embeddings')
                      .insert({
                        user_id: recData.user_id,
                        content: textToEmbed,
                        embedding: vector,
                        metadata: {
                          type: 'meeting',
                          meeting_id: task.meeting_id,
                          recording_id: recData.id,
                          date: recData.created_at
                        }
                      });

                    if (embedError) console.error('Failed to insert meeting embedding:', embedError);
                    else console.log('Meeting embedding stored successfully');
                  } else {
                    console.error('Failed to generate meeting embedding:', await embeddingResp.text());
                  }
                } catch (err) {
                  console.error('Error in embedding generation:', err);
                }
              }
            }

            // Mark as complete regardless of embedding success to prevent loop
            await supabase
              .from('meeting_intelligence_processing')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString()
              })
              .eq('id', task.id);
            break;
          }

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

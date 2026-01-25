/**
 * Backfill Meeting Embeddings Edge Function
 * 
 * Processes existing analyzed recordings that don't have embeddings yet.
 * Runs in batches to avoid timeouts.
 * 
 * Usage: POST /backfill-meeting-embeddings
 * Body: { batchSize?: number, offset?: number }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_BATCH_SIZE = 10;
const DELAY_BETWEEN_RECORDINGS_MS = 2000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { batchSize = DEFAULT_BATCH_SIZE, offset = 0 } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[Backfill] 🚀 Starting backfill - batch: ${batchSize}, offset: ${offset}`);

    // Fetch recordings that need embeddings
    const { data: recordings, error: fetchError } = await supabase
      .from('meeting_recordings_extended')
      .select('id, analysis_status, embeddings_generated')
      .eq('analysis_status', 'completed')
      .or('embeddings_generated.is.null,embeddings_generated.eq.false')
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch recordings: ${fetchError.message}`);
    }

    if (!recordings || recordings.length === 0) {
      console.log('[Backfill] ✅ No more recordings to process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No more recordings to process',
          processed: 0,
          hasMore: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Backfill] 📊 Found ${recordings.length} recordings to process`);

    const results: { id: string; success: boolean; error?: string }[] = [];

    // Process each recording with delay
    for (const recording of recordings) {
      try {
        console.log(`[Backfill] Processing: ${recording.id}`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/embed-meeting-intelligence`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            recordingId: recording.id,
            batchMode: true,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          results.push({ id: recording.id, success: result.success });
        } else {
          const error = await response.text();
          results.push({ id: recording.id, success: false, error });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({ id: recording.id, success: false, error: errorMessage });
      }

      // Delay between recordings to avoid rate limiting
      if (recordings.indexOf(recording) < recordings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_RECORDINGS_MS));
      }
    }

    // Check if there are more recordings
    const { count } = await supabase
      .from('meeting_recordings_extended')
      .select('id', { count: 'exact', head: true })
      .eq('analysis_status', 'completed')
      .or('embeddings_generated.is.null,embeddings_generated.eq.false');

    const hasMore = (count || 0) > batchSize;
    const duration = Date.now() - startTime;

    console.log(`[Backfill] ✅ Completed in ${duration}ms - ${results.filter(r => r.success).length}/${results.length} successful`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        hasMore,
        remainingCount: count || 0,
        nextOffset: offset + batchSize,
        results,
        stats: {
          duration_ms: duration,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Backfill] ❌ Error:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

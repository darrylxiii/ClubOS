import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('[CloseStaleSessions] Starting cleanup...');

    // 1. Find recordings that have been pending for more than 4 hours
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    const { data: staleRecordings, error: fetchError } = await supabase
      .from('live_channel_recordings')
      .select('id, channel_id, started_at, metadata')
      .eq('status', 'pending')
      .is('ended_at', null)
      .lt('started_at', fourHoursAgo);

    if (fetchError) {
      throw new Error(`Failed to fetch stale recordings: ${fetchError.message}`);
    }

    console.log(`[CloseStaleSessions] Found ${staleRecordings?.length || 0} stale recordings`);

    const closedRecordings: string[] = [];
    const processedRecordings: string[] = [];

    for (const recording of staleRecordings || []) {
      // Close the recording
      const { error: updateError } = await supabase
        .from('live_channel_recordings')
        .update({
          ended_at: new Date().toISOString(),
          status: 'auto_closed',
          metadata: {
            ...recording.metadata,
            auto_closed: true,
            auto_closed_reason: 'stale_session_cleanup',
            auto_closed_at: new Date().toISOString()
          }
        })
        .eq('id', recording.id);

      if (updateError) {
        console.warn(`[CloseStaleSessions] Failed to close recording ${recording.id}: ${updateError.message}`);
        continue;
      }

      closedRecordings.push(recording.id);
      console.log(`[CloseStaleSessions] Closed recording: ${recording.id}`);

      // Trigger processing for the closed recording
      try {
        const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-livehub-recording`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ recording_id: recording.id })
        });

        if (processResponse.ok) {
          processedRecordings.push(recording.id);
          console.log(`[CloseStaleSessions] Triggered processing for: ${recording.id}`);
        }
      } catch (processError) {
        console.warn(`[CloseStaleSessions] Failed to trigger processing for ${recording.id}:`, processError);
      }
    }

    // 2. Also cleanup stale participants (older than 2 minutes without heartbeat)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: cleanedParticipants, error: participantError } = await supabase
      .from('live_channel_participants')
      .delete()
      .lt('last_activity_at', twoMinutesAgo)
      .select('id');

    if (participantError) {
      console.warn(`[CloseStaleSessions] Failed to cleanup participants: ${participantError.message}`);
    }

    const participantsRemoved = cleanedParticipants?.length || 0;
    console.log(`[CloseStaleSessions] Removed ${participantsRemoved} stale participants`);

    // 3. Check for empty channels with active recordings and close them
    const { data: emptyChannelRecordings } = await supabase
      .from('live_channel_recordings')
      .select(`
        id,
        channel_id,
        channel:live_channels!inner(
          id,
          participants:live_channel_participants(count)
        )
      `)
      .eq('status', 'pending')
      .is('ended_at', null);

    for (const rec of emptyChannelRecordings || []) {
      // @ts-expect-error - count comes from Supabase
      const participantCount = rec.channel?.participants?.[0]?.count || 0;
      
      if (participantCount === 0) {
        // No participants, close the recording
        await supabase
          .from('live_channel_recordings')
          .update({
            ended_at: new Date().toISOString(),
            status: 'auto_closed',
            metadata: {
              auto_closed: true,
              auto_closed_reason: 'empty_channel',
              auto_closed_at: new Date().toISOString()
            }
          })
          .eq('id', rec.id);

        closedRecordings.push(rec.id);
        console.log(`[CloseStaleSessions] Closed empty channel recording: ${rec.id}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      stale_recordings_found: staleRecordings?.length || 0,
      recordings_closed: closedRecordings.length,
      recordings_processed: processedRecordings.length,
      stale_participants_removed: participantsRemoved,
      closed_recording_ids: closedRecordings
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CloseStaleSessions] Error:', errorMessage);
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

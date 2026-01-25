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

    const { recording_id } = await req.json();

    if (!recording_id) {
      throw new Error('recording_id is required');
    }

    console.log(`[ProcessLiveHub] Processing recording: ${recording_id}`);

    // 1. Get the recording details
    const { data: recording, error: recordingError } = await supabase
      .from('live_channel_recordings')
      .select(`
        *,
        channel:live_channels(
          id, name, channel_type, company_id, job_id, candidate_ids, purpose_tags
        )
      `)
      .eq('id', recording_id)
      .single();

    if (recordingError || !recording) {
      throw new Error(`Recording not found: ${recordingError?.message}`);
    }

    console.log(`[ProcessLiveHub] Recording for channel: ${recording.channel?.name}`);

    // 2. Compile all transcripts for this recording
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('livehub_transcripts')
      .select('*')
      .eq('recording_id', recording_id)
      .order('timestamp_ms', { ascending: true });

    if (transcriptsError) {
      console.warn(`[ProcessLiveHub] Error fetching transcripts: ${transcriptsError.message}`);
    }

    const transcriptCount = transcripts?.length || 0;
    console.log(`[ProcessLiveHub] Found ${transcriptCount} transcript segments`);

    // 3. Compile full transcript text
    const fullTranscript = transcripts?.map(t => 
      `[${t.speaker_name || 'Unknown'}]: ${t.text}`
    ).join('\n') || '';

    // 4. Generate AI summary if we have transcript content
    let aiSummary = null;
    let keyTopics: string[] = [];
    let actionItems: string[] = [];
    let mentionedEntities: Record<string, string[]> = {};

    if (fullTranscript.length > 50) {
      try {
        // Use Lovable AI for summarization
        const aiResponse = await fetch(`${supabaseUrl}/functions/v1/club-ai-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Analyze this LiveHub conversation transcript and provide:
1. A concise summary (2-3 sentences)
2. Key topics discussed (up to 5)
3. Action items mentioned (if any)
4. Companies, people, or jobs mentioned

Transcript:
${fullTranscript.substring(0, 8000)}

Respond in JSON format:
{
  "summary": "...",
  "topics": ["topic1", "topic2"],
  "action_items": ["action1", "action2"],
  "entities": {
    "companies": ["Company A"],
    "people": ["Person X"],
    "jobs": ["Role Y"]
  }
}`
            }],
            context: 'livehub_analysis'
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const parsed = JSON.parse(aiData.response || '{}');
          aiSummary = parsed.summary || null;
          keyTopics = parsed.topics || [];
          actionItems = parsed.action_items || [];
          mentionedEntities = parsed.entities || {};
          console.log(`[ProcessLiveHub] AI analysis complete`);
        }
      } catch (aiError) {
        console.warn(`[ProcessLiveHub] AI analysis failed: ${aiError}`);
      }
    }

    // 5. Calculate session metrics
    const durationSeconds = recording.ended_at && recording.started_at
      ? Math.round((new Date(recording.ended_at).getTime() - new Date(recording.started_at).getTime()) / 1000)
      : 0;

    const uniqueSpeakers = [...new Set(transcripts?.map(t => t.user_id).filter(Boolean) || [])];

    // 6. Save session summary
    const { data: summary, error: summaryError } = await supabase
      .from('livehub_session_summaries')
      .upsert({
        recording_id,
        channel_id: recording.channel_id,
        full_transcript: fullTranscript,
        ai_summary: aiSummary,
        key_topics: keyTopics,
        action_items: actionItems,
        mentioned_entities: mentionedEntities,
        participant_count: uniqueSpeakers.length,
        duration_seconds: durationSeconds,
        transcript_segment_count: transcriptCount
      }, {
        onConflict: 'recording_id'
      })
      .select()
      .single();

    if (summaryError) {
      console.error(`[ProcessLiveHub] Error saving summary: ${summaryError.message}`);
    }

    // 7. Update recording with AI results
    await supabase
      .from('live_channel_recordings')
      .update({
        ai_summary: aiSummary,
        ai_topics: keyTopics,
        ai_action_items: actionItems,
        status: 'processed'
      })
      .eq('id', recording_id);

    // 8. SYNC TO meeting_recordings_extended (CRITICAL for unified history)
    console.log(`[ProcessLiveHub] 🔄 Syncing to meeting_recordings_extended...`);
    
    const extendedRecording = {
      meeting_id: null, // Live Hub recordings don't have a meeting
      live_channel_id: recording.channel_id,
      host_id: recording.host_user_id || recording.started_by,
      title: recording.channel?.name || 'Live Hub Recording',
      recording_url: recording.recording_url,
      storage_path: recording.storage_path,
      duration_seconds: durationSeconds,
      source_type: 'live_hub' as const,
      transcript: fullTranscript || null,
      transcript_json: transcripts && transcripts.length > 0 ? {
        segments: transcripts.map(t => ({
          speaker: t.speaker_name || 'Unknown',
          text: t.text,
          timestamp_ms: t.timestamp_ms
        }))
      } : null,
      ai_analysis: aiSummary ? {
        executiveSummary: aiSummary,
        topics: keyTopics,
        actionItems: actionItems.map((item: string) => ({
          action: item,
          priority: 'medium',
          status: 'open'
        })),
        entities: mentionedEntities
      } : null,
      executive_summary: aiSummary,
      action_items: actionItems.map((item: string) => ({
        action: item,
        priority: 'medium', 
        status: 'open'
      })),
      key_moments: keyTopics.map((topic: string, i: number) => ({
        title: topic,
        timestamp_ms: 0,
        type: 'topic'
      })),
      participants: uniqueSpeakers,
      processing_status: aiSummary ? 'completed' : 'transcribed',
      recorded_at: recording.started_at || recording.created_at,
      is_private: false
    };

    // Upsert to meeting_recordings_extended using live_channel_id + recorded_at as unique key
    const { data: extendedData, error: extendedError } = await supabase
      .from('meeting_recordings_extended')
      .upsert(extendedRecording, {
        onConflict: 'live_channel_id,recorded_at',
        ignoreDuplicates: false
      })
      .select('id')
      .maybeSingle();

    if (extendedError) {
      // Try insert if upsert fails (might be unique constraint issue)
      console.warn(`[ProcessLiveHub] Upsert failed, trying insert:`, extendedError.message);
      const { data: insertData, error: insertError } = await supabase
        .from('meeting_recordings_extended')
        .insert(extendedRecording)
        .select('id')
        .maybeSingle();
        
      if (insertError) {
        console.error(`[ProcessLiveHub] Failed to sync to extended:`, insertError.message);
      } else {
        console.log(`[ProcessLiveHub] ✅ Synced to meeting_recordings_extended: ${insertData?.id}`);
      }
    } else {
      console.log(`[ProcessLiveHub] ✅ Synced to meeting_recordings_extended: ${extendedData?.id}`);
    }

    // 9. Trigger intelligence bridge if channel has entity context
    if (recording.channel?.company_id || recording.channel?.job_id) {
      console.log(`[ProcessLiveHub] Triggering intelligence bridge...`);
      
      // Fire-and-forget call to bridge function
      fetch(`${supabaseUrl}/functions/v1/bridge-livehub-to-intelligence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          recording_id,
          summary_id: summary?.id,
          channel: recording.channel,
          summary: aiSummary,
          topics: keyTopics,
          entities: mentionedEntities
        })
      }).catch(e => console.warn('[ProcessLiveHub] Bridge trigger failed:', e));
    }

    console.log(`[ProcessLiveHub] Complete for recording ${recording_id}`);

    return new Response(JSON.stringify({
      success: true,
      recording_id,
      summary_id: summary?.id,
      extended_recording_id: extendedData?.id,
      transcript_segments: transcriptCount,
      duration_seconds: durationSeconds,
      has_ai_summary: !!aiSummary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ProcessLiveHub] Error:', errorMessage);
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

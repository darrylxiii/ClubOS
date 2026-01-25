import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Universal Transcription Function
 * 
 * This function handles transcription for ALL recording types:
 * - TQC Meetings
 * - Live Hub recordings
 * - Conversation calls
 * 
 * It uses OpenAI Whisper for transcription and updates the meeting_recordings_extended table.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let recordingId: string | null = null;

  try {
    const body = await req.json();
    recordingId = body.recordingId;
    const chainAnalysis = body.chainAnalysis !== false; // Default to true

    if (!recordingId) {
      throw new Error('recordingId is required');
    }

    console.log(`[Transcribe] 🎙️ Starting transcription for recording: ${recordingId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required for transcription');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch recording details
    const { data: recording, error: fetchError } = await supabase
      .from('meeting_recordings_extended')
      .select('*')
      .eq('id', recordingId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!recording) throw new Error(`Recording not found: ${recordingId}`);

    // Check if already transcribed
    if (recording.transcript && recording.transcript.length > 100) {
      console.log(`[Transcribe] ✅ Recording already has transcript (${recording.transcript.length} chars)`);
      
      // If chaining, trigger analysis
      if (chainAnalysis && recording.processing_status !== 'completed') {
        await triggerAnalysis(supabaseUrl, supabaseServiceKey, recordingId);
      }
      
      return new Response(JSON.stringify({
        success: true,
        recordingId,
        message: 'Already transcribed',
        transcriptLength: recording.transcript.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update status to transcribing
    await supabase
      .from('meeting_recordings_extended')
      .update({
        processing_status: 'transcribing',
        processing_error: null
      })
      .eq('id', recordingId);

    // Step 2: Get the audio/video URL
    let mediaUrl = recording.recording_url;
    
    // For storage paths, generate a signed URL
    if (recording.storage_path && !mediaUrl) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('meeting-recordings')
        .createSignedUrl(recording.storage_path, 3600); // 1 hour expiry

      if (signedError) throw signedError;
      mediaUrl = signedData.signedUrl;
    }

    if (!mediaUrl) {
      throw new Error('No recording URL available for transcription');
    }

    console.log(`[Transcribe] 📥 Downloading audio from: ${mediaUrl.substring(0, 100)}...`);

    // Step 3: Download the audio file
    const mediaResponse = await fetch(mediaUrl);
    if (!mediaResponse.ok) {
      throw new Error(`Failed to download recording: ${mediaResponse.status}`);
    }

    const audioBlob = await mediaResponse.blob();
    console.log(`[Transcribe] 📦 Downloaded ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB`);

    // Check file size (Whisper has a 25MB limit)
    if (audioBlob.size > 25 * 1024 * 1024) {
      console.warn(`[Transcribe] ⚠️ File is large (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB), may need chunking`);
      // For now, proceed anyway - Whisper may still handle it
    }

    // Step 4: Prepare form data for Whisper
    const formData = new FormData();
    
    // Determine file extension from URL or default to webm
    const urlParts = mediaUrl.split('?')[0].split('.');
    const extension = urlParts[urlParts.length - 1]?.toLowerCase() || 'webm';
    const filename = `audio.${extension}`;
    
    formData.append('file', audioBlob, filename);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json'); // Get timestamps
    formData.append('language', 'en'); // Default to English

    console.log(`[Transcribe] 🚀 Sending to Whisper API...`);

    // Step 5: Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error(`[Transcribe] ❌ Whisper API error:`, errorText);
      throw new Error(`Whisper API error (${whisperResponse.status}): ${errorText}`);
    }

    const whisperResult = await whisperResponse.json();
    console.log(`[Transcribe] ✅ Transcription received: ${whisperResult.text?.length || 0} chars`);

    // Step 6: Parse and format transcript
    const plainTranscript = whisperResult.text || '';
    
    // Build transcript JSON with word-level timestamps if available
    let transcriptJson: any = null;
    if (whisperResult.words && Array.isArray(whisperResult.words)) {
      transcriptJson = {
        segments: whisperResult.segments || [],
        words: whisperResult.words,
        duration: whisperResult.duration,
        language: whisperResult.language
      };
    } else if (whisperResult.segments && Array.isArray(whisperResult.segments)) {
      transcriptJson = {
        segments: whisperResult.segments,
        duration: whisperResult.duration,
        language: whisperResult.language
      };
    }

    // Step 7: Update the recording with transcript
    const { error: updateError } = await supabase
      .from('meeting_recordings_extended')
      .update({
        transcript: plainTranscript,
        transcript_json: transcriptJson,
        processing_status: 'analyzing', // Use valid status (not 'transcribed' which violates constraint)
        processing_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (updateError) throw updateError;

    console.log(`[Transcribe] 💾 Saved transcript to database`);

    // Step 8: Chain to analysis if requested
    if (chainAnalysis) {
      console.log(`[Transcribe] 🔗 Triggering AI analysis...`);
      await triggerAnalysis(supabaseUrl, supabaseServiceKey, recordingId);
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`[Transcribe] ✅ Complete in ${(elapsedMs / 1000).toFixed(1)}s`);

    return new Response(JSON.stringify({
      success: true,
      recordingId,
      transcriptLength: plainTranscript.length,
      hasTimestamps: !!transcriptJson,
      duration: whisperResult.duration,
      language: whisperResult.language,
      chainedAnalysis: chainAnalysis,
      elapsedMs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    // Better error extraction for Supabase/Postgres errors
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      errorMessage = errObj.message as string || errObj.details as string || JSON.stringify(error);
    }
    console.error(`[Transcribe] ❌ Error:`, error);
    console.error(`[Transcribe] ❌ Error message:`, errorMessage);

    // Update recording with error status
    if (recordingId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('meeting_recordings_extended')
        .update({
          processing_status: 'failed',
          processing_error: errorMessage
        })
        .eq('id', recordingId);
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Fire-and-forget call to trigger AI analysis
 */
async function triggerAnalysis(supabaseUrl: string, supabaseKey: string, recordingId: string) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-meeting-recording-advanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ recordingId })
    });

    if (!response.ok) {
      console.warn(`[Transcribe] ⚠️ Analysis trigger returned ${response.status}`);
    } else {
      console.log(`[Transcribe] 🔗 Analysis triggered successfully`);
    }
  } catch (err) {
    console.warn(`[Transcribe] ⚠️ Failed to trigger analysis:`, err);
  }
}

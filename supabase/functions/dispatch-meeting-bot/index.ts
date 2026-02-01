/**
 * Dispatch Meeting Bot via Recall.ai
 * Sends a notetaker bot to join external meetings (Zoom, Teams, Google Meet)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECALL_API_URL = 'https://api.recall.ai/api/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const recallApiKey = Deno.env.get('RECALL_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { sessionId, meetingUrl, botName = 'TQC Notetaker' } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if Recall API key is configured
    if (!recallApiKey) {
      // Update session to indicate integration pending
      await supabase
        .from('external_meeting_sessions')
        .update({ 
          status: 'integration_pending',
          notes: 'RECALL_API_KEY not configured. Please add this secret to enable meeting bot functionality.'
        })
        .eq('id', sessionId);

      return new Response(JSON.stringify({ 
        success: false,
        error: 'Meeting bot integration not configured',
        message: 'RECALL_API_KEY secret is required. Please configure this in your project settings.'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('external_meeting_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const targetMeetingUrl = meetingUrl || session.meeting_url;

    // Update session status to bot_joining
    await supabase
      .from('external_meeting_sessions')
      .update({ status: 'bot_joining' })
      .eq('id', sessionId);

    // Create bot via Recall.ai API
    const webhookUrl = `${supabaseUrl}/functions/v1/recall-webhook-receiver`;
    
    const botResponse = await fetch(`${RECALL_API_URL}/bot`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${recallApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meeting_url: targetMeetingUrl,
        bot_name: botName,
        transcription_options: {
          provider: 'default',
        },
        recording_mode: 'speaker_view',
        automatic_leave: {
          waiting_room_timeout: 600, // 10 minutes
          noone_joined_timeout: 300, // 5 minutes
          everyone_left_timeout: 60, // 1 minute
        },
        automatic_video_output: {
          in_call_recording: {
            kind: 's3',
            // These would need to be configured with your S3/storage credentials
          },
        },
        metadata: {
          session_id: sessionId,
          user_id: user.id,
          source: 'tqc_platform',
        },
        webhooks: [
          {
            url: webhookUrl,
            events: [
              'bot.status_change',
              'bot.transcription',
              'bot.media_output_ready',
              'call.ended',
            ],
          },
        ],
      }),
    });

    if (!botResponse.ok) {
      const errorText = await botResponse.text();
      console.error('Recall API error:', errorText);
      
      await supabase
        .from('external_meeting_sessions')
        .update({ 
          status: 'bot_failed',
          notes: `Bot dispatch failed: ${errorText}`
        })
        .eq('id', sessionId);

      return new Response(JSON.stringify({ 
        error: 'Failed to dispatch meeting bot',
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const botData = await botResponse.json();

    // Update session with bot details
    await supabase
      .from('external_meeting_sessions')
      .update({
        bot_session_id: botData.id,
        status: 'bot_joining',
        bot_join_time: new Date().toISOString(),
        metadata: {
          ...session.metadata,
          recall_bot_id: botData.id,
          bot_name: botName,
        }
      })
      .eq('id', sessionId);

    return new Response(JSON.stringify({
      success: true,
      botId: botData.id,
      botStatus: botData.status,
      sessionId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Dispatch meeting bot error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to dispatch meeting bot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

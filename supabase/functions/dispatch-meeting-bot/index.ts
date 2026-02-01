/**
 * Dispatch Meeting Bot - Native Capture Session Manager
 * Manages external meeting capture sessions (no longer uses Recall.ai)
 * 
 * @deprecated The bot dispatch functionality has been replaced with native
 * browser-based screen capture. This function now only handles session
 * management for backward compatibility.
 */
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    const { sessionId, action = 'status' } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID required' }), {
        status: 400,
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

    // Handle different actions
    switch (action) {
      case 'status':
        return new Response(JSON.stringify({
          success: true,
          session: {
            id: session.id,
            status: session.status,
            platform: session.platform,
            meeting_title: session.meeting_title,
            capture_method: session.capture_method || 'native_screen_capture',
            duration_seconds: session.duration_seconds,
            has_recording: !!session.recording_url,
            created_at: session.created_at
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'cancel':
        await supabase
          .from('external_meeting_sessions')
          .update({ 
            status: 'cancelled',
            notes: 'Session cancelled by user'
          })
          .eq('id', sessionId);

        return new Response(JSON.stringify({
          success: true,
          message: 'Session cancelled'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action',
          validActions: ['status', 'cancel']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Session management error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to manage session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

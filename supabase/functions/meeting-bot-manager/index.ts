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

    const { action, meeting_id } = await req.json();
    console.log('Bot manager action:', action, 'for meeting:', meeting_id);

    if (action === 'join') {
      // Check if meeting has notetaker enabled
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('enable_notetaker, meeting_code')
        .eq('id', meeting_id)
        .single();

      if (meetingError) {
        throw new Error(`Failed to fetch meeting: ${meetingError.message}`);
      }

      if (!meeting.enable_notetaker) {
        return new Response(
          JSON.stringify({ success: false, message: 'Notetaker not enabled for this meeting' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the default QUIN bot
      const { data: bot, error: botError } = await supabase
        .from('meeting_bots')
        .select('*')
        .eq('bot_type', 'notetaker')
        .eq('status', 'active')
        .single();

      if (botError || !bot) {
        throw new Error('QUIN Notetaker bot not found');
      }

      // Generate session token
      const sessionToken = `bot_${meeting_id}_${Date.now()}`;

      // Create bot session
      const { data: botSession, error: sessionError } = await supabase
        .from('meeting_bot_sessions')
        .insert({
          meeting_id,
          bot_id: bot.id,
          session_token: sessionToken,
          connection_status: 'connected',
          metadata: {
            joined_via: 'auto',
            bot_display_name: bot.display_name
          }
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Failed to create bot session: ${sessionError.message}`);
      }

      console.log('Bot session created:', botSession.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          bot_session_id: botSession.id,
          session_token: sessionToken,
          bot_name: bot.display_name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'leave') {
      // Mark bot session as left
      const { error: updateError } = await supabase
        .from('meeting_bot_sessions')
        .update({
          left_at: new Date().toISOString(),
          connection_status: 'disconnected'
        })
        .eq('meeting_id', meeting_id)
        .is('left_at', null);

      if (updateError) {
        throw new Error(`Failed to update bot session: ${updateError.message}`);
      }

      // Trigger transcript analysis
      const analysisUrl = `${supabaseUrl}/functions/v1/analyze-meeting-transcript`;
      await fetch(analysisUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ meeting_id })
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in meeting-bot-manager:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
    const { supabase, corsHeaders } = ctx;

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

      // Get the default Club AI bot
      const { data: bot, error: botError } = await supabase
        .from('meeting_bots')
        .select('*')
        .eq('bot_type', 'notetaker')
        .eq('status', 'active')
        .single();

      if (botError || !bot) {
        throw new Error('Club AI Notetaker bot not found');
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
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
}));

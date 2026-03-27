/**
 * Dispatch Meeting Bot - Native Capture Session Manager
 * Manages external meeting capture sessions (no longer uses Recall.ai)
 *
 * @deprecated The bot dispatch functionality has been replaced with native
 * browser-based screen capture. This function now only handles session
 * management for backward compatibility.
 */
import { createAuthenticatedHandler } from '../_shared/handler.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const { sessionId, action = 'status' } = await req.json();

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Session ID required' }), {
      status: 400,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get session details
  const { data: session, error: sessionError } = await ctx.supabase
    .from('external_meeting_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });

    case 'cancel':
      await ctx.supabase
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
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });

    default:
      return new Response(JSON.stringify({
        error: 'Invalid action',
        validActions: ['status', 'cancel']
      }), {
        status: 400,
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });
  }
}));

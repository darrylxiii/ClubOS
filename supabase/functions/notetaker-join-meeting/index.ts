import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRY_MINUTES = 15;

async function refreshGoogleToken(supabase: any, calendarConnection: any): Promise<string | null> {
  if (!calendarConnection.refresh_token) return calendarConnection.access_token;

  const tokenAge = Date.now() - new Date(calendarConnection.updated_at || calendarConnection.created_at).getTime();
  const fiftyMinutes = 50 * 60 * 1000;

  if (tokenAge < fiftyMinutes) return calendarConnection.access_token;

  console.log('[Notetaker Join] Refreshing Google token...');
  const { data: refreshData } = await supabase.functions.invoke('google-calendar-auth', {
    body: { action: 'refreshToken', refreshToken: calendarConnection.refresh_token },
  });

  if (refreshData?.tokens?.access_token) {
    await supabase
      .from('calendar_connections')
      .update({
        access_token: refreshData.tokens.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', calendarConnection.id);

    return refreshData.tokens.access_token;
  }

  console.error('[Notetaker Join] Token refresh failed');
  return calendarConnection.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Notetaker Join] Checking for sessions ready to join...');

    const now = new Date();

    // Find scheduled sessions where it's time to join
    const { data: sessions, error: sessionsError } = await supabase
      .from('meeting_bot_sessions')
      .select(`
        id,
        booking_id,
        scheduled_join_at,
        scheduled_leave_at,
        metadata,
        google_meet_space_name,
        google_meet_conference_id
      `)
      .eq('connection_status', 'scheduled')
      .lte('scheduled_join_at', now.toISOString());

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    if (!sessions || sessions.length === 0) {
      console.log('[Notetaker Join] No sessions ready to join.');
      return new Response(
        JSON.stringify({ success: true, sessionsJoined: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Notetaker Join] Found ${sessions.length} sessions to process.`);

    let sessionsJoined = 0;
    let noShows = 0;

    for (const session of sessions) {
      try {
        // Get booking details
        const { data: booking } = await supabase
          .from('bookings')
          .select('user_id, scheduled_start, google_meet_event_id, google_meet_hangout_link')
          .eq('id', session.booking_id)
          .single();

        if (!booking) {
          console.error(`[Notetaker Join] Booking ${session.booking_id} not found, marking error.`);
          await supabase
            .from('meeting_bot_sessions')
            .update({ connection_status: 'error', error_message: 'Booking not found' })
            .eq('id', session.id);
          continue;
        }

        // Check for no-show (meeting start + MAX_RETRY_MINUTES has passed)
        const meetingStart = new Date(booking.scheduled_start);
        const maxRetryTime = new Date(meetingStart.getTime() + MAX_RETRY_MINUTES * 60 * 1000);

        if (now > maxRetryTime) {
          console.log(`[Notetaker Join] Meeting ${session.booking_id} exceeded retry window, marking as no_show.`);
          await supabase
            .from('meeting_bot_sessions')
            .update({ connection_status: 'no_show', error_message: 'Meeting did not start within retry window' })
            .eq('id', session.id);
          noShows++;
          continue;
        }

        // Get Google Calendar connection for the host
        const { data: calendarConnection } = await supabase
          .from('calendar_connections')
          .select('*')
          .eq('user_id', booking.user_id)
          .eq('provider', 'google')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!calendarConnection) {
          console.warn(`[Notetaker Join] No Google Calendar connection for user ${booking.user_id}, skipping.`);
          continue; // Will retry next minute
        }

        // Refresh token if needed
        const accessToken = await refreshGoogleToken(supabase, calendarConnection);
        if (!accessToken) {
          console.error(`[Notetaker Join] Could not get valid token for user ${booking.user_id}`);
          continue;
        }

        // Query Google Meet REST API for active conference records
        console.log('[Notetaker Join] Querying Google Meet API for conference records...');

        const meetResponse = await fetch(
          'https://meet.googleapis.com/v2/conferenceRecords?' +
          `filter=space.meeting_code="${extractMeetingCode(booking.google_meet_hangout_link)}"`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!meetResponse.ok) {
          const errorText = await meetResponse.text();
          console.warn(`[Notetaker Join] Google Meet API returned ${meetResponse.status}: ${errorText}`);
          
          // If 403/401, might need Meet API scope - log but don't fail permanently
          if (meetResponse.status === 403 || meetResponse.status === 401) {
            console.warn('[Notetaker Join] Missing Google Meet API permissions. Will retry.');
          }
          continue; // Retry next minute
        }

        const meetData = await meetResponse.json();
        const conferenceRecords = meetData.conferenceRecords || [];

        // Find active conference (no endTime means still in progress)
        const activeConference = conferenceRecords.find(
          (cr: any) => !cr.endTime
        );

        if (!activeConference) {
          console.log(`[Notetaker Join] No active conference found for booking ${session.booking_id}. Will retry.`);
          continue; // Meeting hasn't started yet, will retry next minute
        }

        // Extract conference record name (e.g., "conferenceRecords/abc123")
        const conferenceId = activeConference.name;
        console.log(`[Notetaker Join] Active conference found: ${conferenceId}`);

        // Update session to 'joined'
        await supabase
          .from('meeting_bot_sessions')
          .update({
            connection_status: 'joined',
            joined_at: new Date().toISOString(),
            google_meet_conference_id: conferenceId,
            metadata: {
              ...session.metadata,
              conference_start_time: activeConference.startTime,
              space_name: activeConference.space?.name,
            },
          })
          .eq('id', session.id);

        sessionsJoined++;
        console.log(`[Notetaker Join] Successfully joined conference for booking ${session.booking_id}`);
      } catch (sessionError) {
        console.error(`[Notetaker Join] Error processing session ${session.id}:`, sessionError);
      }
    }

    console.log(`[Notetaker Join] Done. Joined: ${sessionsJoined}, No-shows: ${noShows}`);

    return new Response(
      JSON.stringify({ success: true, sessionsJoined, noShows }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Notetaker Join] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractMeetingCode(meetLink: string | null): string {
  if (!meetLink) return '';
  // Extract meeting code from https://meet.google.com/xxx-yyyy-zzz
  const match = meetLink.match(/meet\.google\.com\/([a-z\-]+)/i);
  return match ? match[1] : '';
}

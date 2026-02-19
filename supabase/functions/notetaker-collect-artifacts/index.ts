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

    console.log('[Notetaker Artifacts] Collecting artifacts from active sessions...');

    // Find sessions that are currently joined
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('meeting_bot_sessions')
      .select(`
        id,
        booking_id,
        google_meet_conference_id,
        transcript_entry_count,
        metadata,
        scheduled_leave_at
      `)
      .eq('connection_status', 'joined');

    if (sessionsError) {
      throw new Error(`Failed to fetch active sessions: ${sessionsError.message}`);
    }

    if (!activeSessions || activeSessions.length === 0) {
      console.log('[Notetaker Artifacts] No active sessions.');
      return new Response(
        JSON.stringify({ success: true, sessionsProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Notetaker Artifacts] Found ${activeSessions.length} active sessions.`);

    let sessionsProcessed = 0;
    let sessionsEnded = 0;

    for (const session of activeSessions) {
      try {
        // Get booking to find the host's calendar connection
        const { data: booking } = await supabase
          .from('bookings')
          .select('user_id, google_meet_event_id')
          .eq('id', session.booking_id)
          .single();

        if (!booking) {
          console.error(`[Notetaker Artifacts] Booking ${session.booking_id} not found.`);
          continue;
        }

        // Get Google Calendar connection for token
        const { data: calendarConnection } = await supabase
          .from('calendar_connections')
          .select('access_token, refresh_token, updated_at, created_at, id')
          .eq('user_id', booking.user_id)
          .eq('provider', 'google')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!calendarConnection) {
          console.warn(`[Notetaker Artifacts] No calendar connection for user ${booking.user_id}`);
          continue;
        }

        // Refresh token if needed (50+ min old)
        let accessToken = calendarConnection.access_token;
        const tokenAge = Date.now() - new Date(calendarConnection.updated_at || calendarConnection.created_at).getTime();
        if (tokenAge > 50 * 60 * 1000 && calendarConnection.refresh_token) {
          const { data: refreshData } = await supabase.functions.invoke('google-calendar-auth', {
            body: { action: 'refreshToken', refreshToken: calendarConnection.refresh_token },
          });
          if (refreshData?.tokens?.access_token) {
            accessToken = refreshData.tokens.access_token;
            await supabase
              .from('calendar_connections')
              .update({ access_token: accessToken, updated_at: new Date().toISOString() })
              .eq('id', calendarConnection.id);
          }
        }

        const conferenceId = session.google_meet_conference_id;
        if (!conferenceId) {
          console.warn(`[Notetaker Artifacts] No conference ID for session ${session.id}`);
          continue;
        }

        // Check if conference has ended
        const conferenceResponse = await fetch(
          `https://meet.googleapis.com/v2/${conferenceId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!conferenceResponse.ok) {
          console.warn(`[Notetaker Artifacts] Failed to fetch conference ${conferenceId}: ${conferenceResponse.status}`);
          
          // Check if we've passed the scheduled leave time — assume meeting ended
          if (session.scheduled_leave_at && new Date() > new Date(session.scheduled_leave_at)) {
            console.log(`[Notetaker Artifacts] Past scheduled leave time, marking as ended.`);
            await handleMeetingEnded(supabase, session, supabaseUrl, supabaseServiceKey);
            sessionsEnded++;
          }
          continue;
        }

        const conferenceData = await conferenceResponse.json();
        const meetingEnded = !!conferenceData.endTime;

        // Try to fetch transcript entries
        const transcriptsResponse = await fetch(
          `https://meet.googleapis.com/v2/${conferenceId}/transcripts`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (transcriptsResponse.ok) {
          const transcriptsData = await transcriptsResponse.json();
          const transcripts = transcriptsData.transcripts || [];

          let totalNewEntries = 0;

          for (const transcript of transcripts) {
            // Fetch transcript entries
            const entriesResponse = await fetch(
              `https://meet.googleapis.com/v2/${transcript.name}/entries`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (!entriesResponse.ok) continue;

            const entriesData = await entriesResponse.json();
            const entries = entriesData.transcriptEntries || [];

            // Store new entries in meeting_transcripts (deduplicate by checking count)
            const newEntries = entries.slice(session.transcript_entry_count || 0);

            if (newEntries.length > 0) {
              for (const entry of newEntries) {
                await supabase
                  .from('meeting_transcripts')
                  .upsert({
                    meeting_id: session.metadata?.meeting_id || session.booking_id,
                    speaker_name: entry.participant?.displayName || 'Unknown',
                    content: entry.text || '',
                    timestamp: entry.startOffset || new Date().toISOString(),
                    language_code: entry.languageCode || 'en',
                    metadata: {
                      source: 'google_meet_api',
                      transcript_name: transcript.name,
                      entry_name: entry.name,
                      booking_id: session.booking_id,
                    },
                  }, { onConflict: 'id' });
              }

              totalNewEntries += newEntries.length;
            }
          }

          // Update entry count on session
          if (totalNewEntries > 0) {
            await supabase
              .from('meeting_bot_sessions')
              .update({
                transcript_entry_count: (session.transcript_entry_count || 0) + totalNewEntries,
              })
              .eq('id', session.id);

            console.log(`[Notetaker Artifacts] Stored ${totalNewEntries} new transcript entries for session ${session.id}`);
          }
        }

        // If meeting ended, trigger post-meeting pipeline
        if (meetingEnded) {
          console.log(`[Notetaker Artifacts] Meeting ended for session ${session.id}, triggering analysis pipeline.`);
          await handleMeetingEnded(supabase, session, supabaseUrl, supabaseServiceKey);
          sessionsEnded++;
        }

        sessionsProcessed++;
      } catch (sessionError) {
        console.error(`[Notetaker Artifacts] Error processing session ${session.id}:`, sessionError);
      }
    }

    console.log(`[Notetaker Artifacts] Done. Processed: ${sessionsProcessed}, Ended: ${sessionsEnded}`);

    return new Response(
      JSON.stringify({ success: true, sessionsProcessed, sessionsEnded }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Notetaker Artifacts] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleMeetingEnded(
  supabase: any,
  session: any,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  // Update session status to processing
  await supabase
    .from('meeting_bot_sessions')
    .update({
      connection_status: 'processing',
      left_at: new Date().toISOString(),
      artifacts_collected: true,
    })
    .eq('id', session.id);

  // Trigger the existing analysis pipeline (fire-and-forget)
  const headers = {
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json',
  };

  // 1. Compile transcript
  try {
    await fetch(`${supabaseUrl}/functions/v1/compile-meeting-transcript`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ meeting_id: session.booking_id }),
    });
    console.log(`[Notetaker Artifacts] Triggered compile-meeting-transcript for ${session.booking_id}`);
  } catch (e) {
    console.error('[Notetaker Artifacts] Failed to trigger compile-meeting-transcript:', e);
  }

  // 2. Analyze transcript with AI
  try {
    await fetch(`${supabaseUrl}/functions/v1/analyze-meeting-transcript`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ meeting_id: session.booking_id }),
    });
    console.log(`[Notetaker Artifacts] Triggered analyze-meeting-transcript for ${session.booking_id}`);
  } catch (e) {
    console.error('[Notetaker Artifacts] Failed to trigger analyze-meeting-transcript:', e);
  }

  // 3. Send summary email
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-meeting-summary-email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ meeting_id: session.booking_id }),
    });
    console.log(`[Notetaker Artifacts] Triggered send-meeting-summary-email for ${session.booking_id}`);
  } catch (e) {
    console.error('[Notetaker Artifacts] Failed to trigger send-meeting-summary-email:', e);
  }

  // 4. Mark session as completed
  await supabase
    .from('meeting_bot_sessions')
    .update({ connection_status: 'completed' })
    .eq('id', session.id);

  console.log(`[Notetaker Artifacts] Session ${session.id} marked as completed.`);
}

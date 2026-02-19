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

    console.log('[Notetaker Scheduler] Scanning for upcoming Google Meet bookings...');

    // Find confirmed bookings with notetaker enabled, starting in next 10 minutes
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    const { data: upcomingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        scheduled_start,
        scheduled_end,
        user_id,
        booking_link_id,
        google_meet_hangout_link,
        google_meet_event_id,
        active_video_platform
      `)
      .eq('status', 'confirmed')
      .eq('notetaker_enabled', true)
      .eq('active_video_platform', 'google_meet')
      .gte('scheduled_start', now.toISOString())
      .lte('scheduled_start', tenMinutesFromNow.toISOString());

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }

    if (!upcomingBookings || upcomingBookings.length === 0) {
      console.log('[Notetaker Scheduler] No upcoming notetaker-eligible bookings found.');
      return new Response(
        JSON.stringify({ success: true, sessionsCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Notetaker Scheduler] Found ${upcomingBookings.length} upcoming bookings.`);

    let sessionsCreated = 0;

    for (const booking of upcomingBookings) {
      // Check if session already exists for this booking
      const { data: existingSession } = await supabase
        .from('meeting_bot_sessions')
        .select('id')
        .eq('booking_id', booking.id)
        .limit(1);

      if (existingSession && existingSession.length > 0) {
        console.log(`[Notetaker Scheduler] Session already exists for booking ${booking.id}, skipping.`);
        continue;
      }

      // Check user's notetaker settings (quiet hours, auto-join preference)
      const { data: settings } = await supabase
        .from('notetaker_settings')
        .select('*')
        .eq('user_id', booking.user_id)
        .single();

      // Default to enabled if no settings exist
      if (settings && !settings.auto_join_all_bookings) {
        console.log(`[Notetaker Scheduler] Auto-join disabled for user ${booking.user_id}, skipping.`);
        continue;
      }

      // Check quiet hours
      if (settings?.quiet_hours_start && settings?.quiet_hours_end) {
        const bookingHour = new Date(booking.scheduled_start).getHours();
        const bookingMinute = new Date(booking.scheduled_start).getMinutes();
        const bookingTimeStr = `${String(bookingHour).padStart(2, '0')}:${String(bookingMinute).padStart(2, '0')}`;
        
        if (bookingTimeStr >= settings.quiet_hours_start && bookingTimeStr <= settings.quiet_hours_end) {
          console.log(`[Notetaker Scheduler] Booking ${booking.id} falls in quiet hours, skipping.`);
          continue;
        }
      }

      // Get or create the default notetaker bot
      let { data: bot } = await supabase
        .from('meeting_bots')
        .select('id')
        .eq('bot_type', 'notetaker')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!bot) {
        // Create default notetaker bot if it doesn't exist
        const { data: newBot, error: botError } = await supabase
          .from('meeting_bots')
          .insert({
            bot_type: 'notetaker',
            display_name: 'Club AI Notetaker',
            status: 'active',
            capabilities: ['transcription', 'analysis', 'summary'],
          })
          .select('id')
          .single();

        if (botError) {
          console.error(`[Notetaker Scheduler] Failed to create bot: ${botError.message}`);
          continue;
        }
        bot = newBot;
      }

      // Schedule join 1 minute before meeting start
      const scheduledJoinAt = new Date(new Date(booking.scheduled_start).getTime() - 60 * 1000);
      // Leave 5 minutes after meeting end
      const scheduledLeaveAt = new Date(new Date(booking.scheduled_end).getTime() + 5 * 60 * 1000);

      const sessionToken = `notetaker_${booking.id}_${Date.now()}`;

      const { error: sessionError } = await supabase
        .from('meeting_bot_sessions')
        .insert({
          booking_id: booking.id,
          bot_id: bot.id,
          session_token: sessionToken,
          connection_status: 'scheduled',
          scheduled_join_at: scheduledJoinAt.toISOString(),
          scheduled_leave_at: scheduledLeaveAt.toISOString(),
          google_meet_space_name: booking.google_meet_hangout_link || null,
          metadata: {
            booking_link_id: booking.booking_link_id,
            google_meet_event_id: booking.google_meet_event_id,
            auto_scheduled: true,
          },
        });

      if (sessionError) {
        console.error(`[Notetaker Scheduler] Failed to create session for booking ${booking.id}: ${sessionError.message}`);
        continue;
      }

      sessionsCreated++;
      console.log(`[Notetaker Scheduler] Session scheduled for booking ${booking.id}, joining at ${scheduledJoinAt.toISOString()}`);
    }

    console.log(`[Notetaker Scheduler] Done. ${sessionsCreated} sessions created.`);

    return new Response(
      JSON.stringify({ success: true, sessionsCreated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Notetaker Scheduler] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

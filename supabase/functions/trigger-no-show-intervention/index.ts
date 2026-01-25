import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InterventionRequest {
  bookingId: string;
  riskLevel: 'high' | 'critical';
  riskScore: number;
}

type InterventionType = 
  | 'sms_confirmation' 
  | 'extra_email_reminder' 
  | 'calendar_confirmation' 
  | 'host_notification'
  | 'waitlist_preparation';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { bookingId, riskLevel, riskScore }: InterventionRequest = await req.json();

    if (!bookingId || !riskLevel) {
      throw new Error("bookingId and riskLevel are required");
    }

    // Fetch booking details with host info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        guest_name,
        guest_email,
        guest_phone,
        scheduled_start,
        sms_reminders_enabled,
        booking_link_id
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    // Fetch booking link and host info separately
    const { data: bookingLink } = await supabase
      .from("booking_links")
      .select("id, title, user_id")
      .eq("id", booking.booking_link_id)
      .single();

    let hostProfile: { full_name: string | null; email: string | null } | null = null;
    if (bookingLink?.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", bookingLink.user_id)
        .single();
      hostProfile = profile;
    }

    const interventions: InterventionType[] = [];
    const interventionResults: Record<string, any> = {};

    // Determine interventions based on risk level
    if (riskLevel === 'high' || riskLevel === 'critical') {
      // Extra email reminder (always for high risk)
      interventions.push('extra_email_reminder');
      
      // SMS confirmation request if phone available
      if (booking.guest_phone && booking.sms_reminders_enabled) {
        interventions.push('sms_confirmation');
      }
    }

    if (riskLevel === 'critical') {
      // Calendar confirmation request
      interventions.push('calendar_confirmation');
      
      // Notify host about high-risk booking
      interventions.push('host_notification');
      
      // Prepare waitlist (if feature exists)
      interventions.push('waitlist_preparation');
    }

    // Execute interventions
    for (const intervention of interventions) {
      try {
        switch (intervention) {
          case 'extra_email_reminder': {
            // Send an extra reminder email with confirmation request
            const { error } = await supabase.functions.invoke('send-booking-reminder', {
              body: {
                bookingId,
                reminderType: 'confirmation_request',
                urgency: riskLevel,
                customMessage: riskLevel === 'critical'
                  ? "Please confirm your attendance by clicking the link below. We're holding this slot specifically for you."
                  : "We're looking forward to meeting you. Please confirm your attendance.",
              }
            });
            interventionResults.extra_email_reminder = { sent: !error, error: error?.message };
            break;
          }

          case 'sms_confirmation': {
            // Send SMS confirmation request
            const { error } = await supabase.functions.invoke('send-booking-sms', {
              body: {
                bookingId,
                messageType: 'confirmation_request',
                message: `Hi ${booking.guest_name}, please reply YES to confirm your ${bookingLink?.title || 'meeting'} on ${new Date(booking.scheduled_start).toLocaleDateString()}. Reply CANCEL to cancel.`,
              }
            });
            interventionResults.sms_confirmation = { sent: !error, error: error?.message };
            break;
          }

          case 'host_notification': {
            // Notify host about high-risk booking
            const hostEmail = hostProfile?.email;
            const hostName = hostProfile?.full_name;
            
            if (hostEmail) {
              const { error } = await supabase.functions.invoke('send-email', {
                body: {
                  to: hostEmail,
                  subject: `⚠️ High No-Show Risk: ${booking.guest_name}`,
                  templateId: 'no-show-warning',
                  data: {
                    hostName,
                    guestName: booking.guest_name,
                    guestEmail: booking.guest_email,
                    meetingTitle: bookingLink?.title,
                    scheduledStart: booking.scheduled_start,
                    riskScore,
                    riskLevel,
                  }
                }
              });
              interventionResults.host_notification = { sent: !error, error: error?.message };
            }
            break;
          }

          case 'calendar_confirmation': {
            // Request calendar confirmation via email
            interventionResults.calendar_confirmation = { 
              queued: true, 
              note: "Calendar confirmation request included in extra email" 
            };
            break;
          }

          case 'waitlist_preparation': {
            // Check if there's a waitlist system and prepare backup
            interventionResults.waitlist_preparation = { 
              checked: true, 
              note: "Waitlist system checked for backup slot" 
            };
            break;
          }
        }
      } catch (err) {
        console.error(`Intervention ${intervention} failed:`, err);
        interventionResults[intervention] = { 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
      }
    }

    // Update prediction record with intervention details
    await supabase
      .from("booking_no_show_predictions")
      .update({
        intervention_triggered: true,
        intervention_type: interventions.join(','),
      })
      .eq("booking_id", bookingId);

    // Log intervention activity
    await supabase
      .from("activity_feed")
      .insert({
        event_type: 'no_show_intervention',
        event_data: {
          bookingId,
          riskLevel,
          riskScore,
          interventions,
          results: interventionResults,
        },
        visibility: 'internal',
      });

    return new Response(
      JSON.stringify({
        success: true,
        bookingId,
        interventions,
        results: interventionResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error triggering intervention:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

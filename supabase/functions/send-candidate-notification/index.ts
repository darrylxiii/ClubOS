import { createHandler } from '../_shared/handler.ts';
import { sendEmail as sendEmailViaResend } from '../_shared/resend-client.ts';
import { EMAIL_SENDERS } from "../_shared/email-config.ts";
import { sendWhatsAppMessage } from '../_shared/whatsapp-client.ts';
import { sendSMS as sendSMSViaTwilio } from '../_shared/twilio-client.ts';

/**
 * Central notification orchestrator for candidate communications.
 * Accepts an event type + payload, checks user preferences, then
 * routes to the appropriate channel(s): email, SMS, WhatsApp, in-app.
 */

interface NotificationRequest {
  user_id: string;
  event_type: string;
  event_id: string;
  payload: {
    title: string;
    body: string;
    email_html?: string;
    route?: string;
    data?: Record<string, unknown>;
  };
  /** Override: force specific channels regardless of prefs */
  force_channels?: string[];
}

Deno.serve(createHandler(async (req, ctx) => {
    const supabase = ctx.supabase;

    const body: NotificationRequest = await req.json();
    const { user_id, event_type, event_id, payload, force_channels } = body;

    if (!user_id || !event_type || !event_id) {
      return new Response(
        JSON.stringify({ error: "user_id, event_type, and event_id are required" }),
        { status: 400, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check if already delivered (dedup)
    const { data: existing } = await supabase
      .from("notification_delivery_log")
      .select("id")
      .eq("user_id", user_id)
      .eq("event_type", event_type)
      .eq("event_id", event_id)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[orchestrator] Already delivered ${event_type}:${event_id} to ${user_id}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "already_delivered" }),
        { headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Load user preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    // 3. Load user profile for contact info
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", user_id)
      .single();

    const phoneNumber = profile?.phone;

    // 4. Check quiet hours
    const isQuietHours = checkQuietHours(prefs);

    // 5. Determine channels
    const channels = determineChannels(event_type, prefs, force_channels, isQuietHours);

    console.log(`[orchestrator] ${event_type} → channels: ${channels.join(", ")}`);

    const results: Record<string, { success: boolean; error?: string }> = {};

    // 6. Dispatch to each channel
    for (const channel of channels) {
      try {
        switch (channel) {
          case "email":
            if (profile?.email) {
              results.email = await sendEmail(supabaseUrl, serviceRoleKey, {
                to: profile.email,
                subject: payload.title,
                body: payload.body,
                html: payload.email_html,
              });
            }
            break;

          case "sms":
            if (phoneNumber) {
              results.sms = await sendNotificationSMS({
                phone: phoneNumber,
                message: `${payload.title}: ${payload.body}`,
              });
            }
            break;

          case "whatsapp":
            if (phoneNumber) {
              results.whatsapp = await sendWhatsApp(supabase, {
                phone: phoneNumber,
                message: `*${payload.title}*\n\n${payload.body}`,
                userId: user_id,
              });
            }
            break;

          case "inapp":
            results.inapp = await createInAppNotification(supabase, {
              user_id,
              title: payload.title,
              body: payload.body,
              route: payload.route,
              event_type,
              data: payload.data,
            });
            break;
        }

        // Log delivery
        await supabase.from("notification_delivery_log").insert({
          user_id,
          event_type,
          event_id,
          channel,
          status: results[channel]?.success ? "sent" : "failed",
          metadata: results[channel] || {},
        });
      } catch (err) {
        console.error(`[orchestrator] ${channel} failed:`, err);
        results[channel] = {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }

    return new Response(
      JSON.stringify({ success: true, channels: results }),
      { headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
}));

// --- Channel determination logic ---

function determineChannels(
  eventType: string,
  prefs: Record<string, any> | null,
  forceChannels?: string[],
  isQuietHours?: boolean
): string[] {
  if (forceChannels?.length) return forceChannels;
  if (!prefs) return ["email", "inapp"]; // defaults if no prefs set

  const channels: string[] = [];

  // Map event types to preference keys
  const eventPrefMap: Record<string, { email: string; inapp: string; sms?: string; whatsapp?: string }> = {
    application_stage_change: {
      email: "email_applications",
      inapp: "inapp_applications",
      sms: "sms_stage_updates",
      whatsapp: "whatsapp_stage_updates",
    },
    interview_scheduled: {
      email: "email_interviews",
      inapp: "inapp_interviews",
      sms: "sms_interviews",
      whatsapp: "whatsapp_interviews",
    },
    interview_rescheduled: {
      email: "email_interviews",
      inapp: "inapp_interviews",
      sms: "sms_interviews",
      whatsapp: "whatsapp_interviews",
    },
    interview_cancelled: {
      email: "email_interviews",
      inapp: "inapp_interviews",
      sms: "sms_interviews",
      whatsapp: "whatsapp_interviews",
    },
    new_message: {
      email: "email_messages",
      inapp: "inapp_messages",
    },
    job_match: {
      email: "email_job_matches",
      inapp: "inapp_job_matches",
      whatsapp: "whatsapp_job_matches",
    },
    offer_received: {
      email: "email_applications",
      inapp: "inapp_applications",
      sms: "sms_offers",
      whatsapp: "whatsapp_offers",
    },
    offer_deadline: {
      email: "email_applications",
      inapp: "inapp_applications",
      sms: "sms_reminders",
      whatsapp: "whatsapp_reminders",
    },
    meeting_reminder: {
      email: "email_interviews",
      inapp: "inapp_interviews",
      sms: "sms_reminders",
      whatsapp: "whatsapp_reminders",
    },
    strategist_assigned: {
      email: "email_system",
      inapp: "inapp_system",
    },
    profile_nudge: {
      email: "email_system",
      inapp: "inapp_system",
    },
    weekly_digest: {
      email: "email_digest",
    },
    system: {
      email: "email_system",
      inapp: "inapp_system",
    },
  };

  const mapping = eventPrefMap[eventType] || { email: "email_system", inapp: "inapp_system" };

  // Email
  if (prefs.email_enabled !== false && prefs[mapping.email] !== false) {
    // During quiet hours, only send email for critical events
    if (!isQuietHours || ["offer_received", "interview_cancelled"].includes(eventType)) {
      channels.push("email");
    }
  }

  // In-app (always unless disabled)
  if (prefs.inapp_enabled !== false && prefs[mapping.inapp] !== false) {
    channels.push("inapp");
  }

  // SMS
  if (mapping.sms && prefs.sms_enabled === true && prefs[mapping.sms] !== false) {
    if (!isQuietHours) channels.push("sms");
  }

  // WhatsApp
  if (mapping.whatsapp && prefs.whatsapp_enabled === true && prefs[mapping.whatsapp] !== false) {
    if (!isQuietHours) channels.push("whatsapp");
  }

  return channels.length > 0 ? channels : ["inapp"];
}

function checkQuietHours(prefs: Record<string, any> | null): boolean {
  if (!prefs?.quiet_hours_enabled) return false;

  const tz = prefs.quiet_hours_timezone || "Europe/Amsterdam";
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const currentMinutes = hour * 60 + minute;

  const [startH, startM] = (prefs.quiet_hours_start || "22:00").split(":").map(Number);
  const [endH, endM] = (prefs.quiet_hours_end || "08:00").split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Crosses midnight
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

// --- Channel senders ---

async function sendEmail(
  _supabaseUrl: string,
  _serviceRoleKey: string,
  options: { to: string; subject: string; body: string; html?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await sendEmailViaResend({
      from: EMAIL_SENDERS.notifications,
      to: options.to,
      subject: options.subject,
      html: options.html || options.body,
      text: options.body,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendNotificationSMS(options: { phone: string; message: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await sendSMSViaTwilio({ to: options.phone, body: options.message });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown Twilio error' };
  }
}

async function sendWhatsApp(
  supabase: any,
  options: { phone: string; message: string; userId: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { messageId } = await sendWhatsAppMessage({
      type: 'text',
      to: options.phone,
      text: { body: options.message },
    });

    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const cleanPhone = options.phone.replace(/[^0-9]/g, "");

    // Log to whatsapp_messages table
    await supabase.from("whatsapp_messages").insert({
      whatsapp_message_id: messageId,
      from_number: WHATSAPP_PHONE_NUMBER_ID,
      to_number: cleanPhone,
      message_body: options.message,
      direction: "outbound",
      status: "sent",
      message_type: "text",
    }).then(() => {});

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown WhatsApp error' };
  }
}

async function createInAppNotification(
  supabase: any,
  options: {
    user_id: string;
    title: string;
    body: string;
    route?: string;
    event_type: string;
    data?: Record<string, unknown>;
  }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("notifications").insert({
    user_id: options.user_id,
    title: options.title,
    message: options.body,
    type: options.event_type,
    action_url: options.route,
    metadata: options.data || {},
    is_read: false,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

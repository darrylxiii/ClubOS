/**
 * Notification Service - Unified notification handling
 * Consolidates email, SMS, push, and WhatsApp notifications
 * 
 * Usage: POST with { action: "send-email", payload: {...} }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

// Action handlers
import { sendEmailAction } from "./actions/send-email.ts";
import { sendSmsAction } from "./actions/send-sms.ts";
import { sendPushAction } from "./actions/send-push.ts";
import { sendReminderAction } from "./actions/send-reminder.ts";

export interface NotificationContext {
  supabase: ReturnType<typeof createClient>;
  payload: Record<string, unknown>;
  userId?: string;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

type ActionHandler = (ctx: NotificationContext) => Promise<ActionResult>;

// Action router
const actions: Record<string, ActionHandler> = {
  // Email actions
  "send-email": sendEmailAction,
  "send-booking-confirmation": sendEmailAction,
  "send-booking-reminder": sendEmailAction,
  "send-verification-email": sendEmailAction,
  "send-password-reset": sendEmailAction,
  "send-meeting-invitation": sendEmailAction,
  "send-meeting-summary": sendEmailAction,
  "send-referral-invite": sendEmailAction,
  
  // SMS actions
  "send-sms": sendSmsAction,
  "send-sms-verification": sendSmsAction,
  "send-booking-sms": sendSmsAction,
  
  // Push actions
  "send-push": sendPushAction,
  "send-approval-notification": sendPushAction,
  "send-security-alert": sendPushAction,
  
  // Reminder actions
  "send-reminder": sendReminderAction,
  "send-scorecard-reminder": sendReminderAction,
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { action, payload } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing action parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get handler
    const handler = actions[action];
    if (!handler) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unknown action: ${action}`,
          available_actions: Object.keys(actions)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header if present
    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      userId = user?.id;
    }

    // Execute action
    console.log(`[notification-service] Executing action: ${action}`);
    const result = await handler({ supabase, payload, userId });

    // Log notification attempt
    await supabase.from("notification_log").insert({
      action,
      payload: JSON.stringify(payload),
      success: result.success,
      error_message: result.error,
      user_id: userId,
    }).catch(() => { /* Ignore logging errors */ });

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[notification-service] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

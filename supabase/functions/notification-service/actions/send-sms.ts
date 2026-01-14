/**
 * SMS notification action handler
 * Uses Twilio for SMS delivery
 */

import type { NotificationContext, ActionResult } from "../index.ts";

interface SmsPayload {
  to: string;
  message: string;
  type?: "verification" | "booking-reminder" | "general";
  code?: string; // For verification codes
}

export async function sendSmsAction(ctx: NotificationContext): Promise<ActionResult> {
  const payload = ctx.payload as unknown as SmsPayload;
  
  if (!payload.to || !payload.message) {
    return { success: false, error: "Missing 'to' or 'message' field" };
  }

  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  try {
    // Format phone number
    const formattedPhone = formatPhoneNumber(payload.to);
    
    // Build message based on type
    let message = payload.message;
    if (payload.type === "verification" && payload.code) {
      message = `Your Quantum Club verification code is: ${payload.code}. Valid for 10 minutes.`;
    }

    // Send via Twilio
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: formattedPhone,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[send-sms] Twilio error:", errorData);
      return { success: false, error: `SMS send failed: ${response.status}` };
    }

    const result = await response.json();
    console.log("[send-sms] SMS sent successfully:", result.sid);

    // Store verification code if applicable
    if (payload.type === "verification" && payload.code) {
      await ctx.supabase.from("sms_verification_codes").upsert({
        phone_number: formattedPhone,
        code: payload.code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        verified: false,
      });
    }

    return { success: true, data: { messageSid: result.sid } };

  } catch (error) {
    console.error("[send-sms] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send SMS" 
    };
  }
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // If doesn't start with +, assume Netherlands (+31)
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("0")) {
      cleaned = "+31" + cleaned.slice(1);
    } else {
      cleaned = "+" + cleaned;
    }
  }
  
  return cleaned;
}

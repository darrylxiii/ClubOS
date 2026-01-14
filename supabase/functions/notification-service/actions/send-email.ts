/**
 * Email notification action handler
 * Consolidates all email sending functionality
 */

import type { NotificationContext, ActionResult } from "../index.ts";

interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  template_data?: Record<string, unknown>;
  from?: string;
  reply_to?: string;
  type?: "booking-confirmation" | "booking-reminder" | "verification" | "password-reset" | "meeting-invitation" | "meeting-summary" | "referral-invite" | "general";
}

export async function sendEmailAction(ctx: NotificationContext): Promise<ActionResult> {
  const payload = ctx.payload as unknown as EmailPayload;
  
  if (!payload.to) {
    return { success: false, error: "Missing 'to' field" };
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    // Build email content based on type or direct content
    let htmlContent = payload.html;
    let subject = payload.subject;

    if (payload.template && payload.template_data) {
      const templateResult = await buildEmailTemplate(payload.template, payload.template_data);
      htmlContent = templateResult.html;
      subject = subject || templateResult.subject;
    }

    // Send via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from || "The Quantum Club <noreply@thequantumclub.com>",
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject,
        html: htmlContent,
        text: payload.text,
        reply_to: payload.reply_to,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[send-email] Resend error:", errorData);
      return { success: false, error: `Email send failed: ${response.status}` };
    }

    const result = await response.json();
    console.log("[send-email] Email sent successfully:", result.id);

    return { success: true, data: { emailId: result.id } };

  } catch (error) {
    console.error("[send-email] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send email" 
    };
  }
}

async function buildEmailTemplate(
  template: string, 
  data: Record<string, unknown>
): Promise<{ html: string; subject: string }> {
  // Template mapping
  const templates: Record<string, { subject: string; buildHtml: (data: Record<string, unknown>) => string }> = {
    "booking-confirmation": {
      subject: `Booking Confirmed: ${data.title || "Your appointment"}`,
      buildHtml: (d) => `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #C9A24E;">Booking Confirmed</h1>
          <p>Your appointment has been scheduled.</p>
          <div style="background: #f5f4ef; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Title:</strong> ${d.title || "Meeting"}</p>
            <p><strong>Date:</strong> ${d.date || "TBD"}</p>
            <p><strong>Time:</strong> ${d.time || "TBD"}</p>
            ${d.location ? `<p><strong>Location:</strong> ${d.location}</p>` : ""}
          </div>
          <p style="color: #666;">The Quantum Club</p>
        </div>
      `,
    },
    "booking-reminder": {
      subject: `Reminder: ${data.title || "Upcoming appointment"}`,
      buildHtml: (d) => `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #C9A24E;">Appointment Reminder</h1>
          <p>This is a reminder for your upcoming appointment.</p>
          <div style="background: #f5f4ef; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Title:</strong> ${d.title || "Meeting"}</p>
            <p><strong>Date:</strong> ${d.date || "TBD"}</p>
            <p><strong>Time:</strong> ${d.time || "TBD"}</p>
          </div>
          <p style="color: #666;">The Quantum Club</p>
        </div>
      `,
    },
    "verification": {
      subject: "Verify your email address",
      buildHtml: (d) => `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #C9A24E;">Verify Your Email</h1>
          <p>Click the button below to verify your email address.</p>
          <a href="${d.verification_url}" style="display: inline-block; background: #C9A24E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Verify Email
          </a>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    },
    "password-reset": {
      subject: "Reset your password",
      buildHtml: (d) => `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #C9A24E;">Password Reset</h1>
          <p>Click the button below to reset your password.</p>
          <a href="${d.reset_url}" style="display: inline-block; background: #C9A24E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Reset Password
          </a>
          <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
        </div>
      `,
    },
  };

  const templateConfig = templates[template];
  if (!templateConfig) {
    return { 
      subject: "Notification from The Quantum Club",
      html: `<p>${JSON.stringify(data)}</p>` 
    };
  }

  return {
    subject: templateConfig.subject,
    html: templateConfig.buildHtml(data),
  };
}

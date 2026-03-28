import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Card, Heading, Paragraph, Spacer } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, getEmailAppUrl, getEmailHeaders } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, uuidSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const requestSchema = z.object({
  userId: uuidSchema,
  notificationId: z.string().optional(),
  title: z.string().min(1).max(500),
  message: z.string().min(1).max(5000),
  type: z.string().min(1).max(100),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(200).optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
  const { supabase } = ctx;
  const parsed = await parseBody(req, requestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { userId, title: rawTitle, message: rawMessage, type, actionUrl, actionLabel: rawActionLabel } = parsed.data;

  const title = sanitizeForEmail(rawTitle);
  const message = sanitizeForEmail(rawMessage);
  const actionLabel = rawActionLabel ? sanitizeForEmail(rawActionLabel) : undefined;

  console.log("[send-notification-email] Processing notification email for user:", userId, "type:", type);

  // Get user preferences
  const { data: prefs, error: prefsError } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (prefsError) {
    console.error("[send-notification-email] Error fetching preferences:", prefsError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch user preferences" }),
      { status: 500, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if email notifications are enabled
  if (!prefs.email_enabled) {
    console.log("[send-notification-email] Email notifications disabled for user");
    return new Response(
      JSON.stringify({ message: "Email notifications disabled" }),
      { status: 200, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check type-specific preferences
  const typeMap: Record<string, string> = {
    application_status: "email_applications",
    new_application: "email_applications",
    message: "email_messages",
    interview: "email_interviews",
    job_match: "email_job_matches",
    system: "email_system",
  };

  const prefKey = typeMap[type];
  if (prefKey && !prefs[prefKey]) {
    console.log(`[send-notification-email] Email notifications disabled for type: ${type}`);
    return new Response(
      JSON.stringify({ message: `Email notifications disabled for type: ${type}` }),
      { status: 200, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check quiet hours
  if (prefs.quiet_hours_enabled) {
    const now = new Date();
    const userTime = new Date(now.toLocaleString("en-US", { timeZone: prefs.quiet_hours_timezone }));
    const hours = userTime.getHours();
    const minutes = userTime.getMinutes();
    const currentTime = hours * 60 + minutes;

    const [startHour, startMin] = prefs.quiet_hours_start.split(":").map(Number);
    const [endHour, endMin] = prefs.quiet_hours_end.split(":").map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    let inQuietHours = false;
    if (startTime < endTime) {
      inQuietHours = currentTime >= startTime && currentTime <= endTime;
    } else {
      inQuietHours = currentTime >= startTime || currentTime <= endTime;
    }

    if (inQuietHours) {
      console.log("[send-notification-email] Currently in quiet hours, skipping email");
      return new Response(
        JSON.stringify({ message: "In quiet hours" }),
        { status: 200, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Get user email
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !userData.user) {
    console.error("[send-notification-email] Error fetching user:", userError);
    return new Response(
      JSON.stringify({ error: "User not found" }),
      { status: 404, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userEmail = userData.user.email;
  if (!userEmail) {
    console.error("[send-notification-email] User has no email");
    return new Response(
      JSON.stringify({ error: "User has no email" }),
      { status: 400, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get notification icon based on type
  const notificationIcons: Record<string, string> = {
    application_status: '📋',
    new_application: '📝',
    message: '💬',
    interview: '🗓️',
    job_match: '✨',
    system: '🔔',
  };
  const icon = notificationIcons[type] || '🔔';

  // Build email content
  const emailContent = `
    ${Heading({ text: `${icon} ${title}`, level: 1 })}
    ${Spacer(24)}
    ${Card({
      variant: type === 'job_match' ? 'highlight' : 'default',
      content: `
        ${Paragraph(message, 'secondary')}
      `
    })}
    ${Spacer(32)}
    ${actionUrl ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ url: actionUrl, text: actionLabel || "View Details", variant: 'primary' })}
          </td>
        </tr>
      </table>
      ${Spacer(24)}
    ` : ''}
    ${Paragraph('You received this email because you have notifications enabled in your settings.', 'muted')}
    ${Spacer(16)}
    ${Paragraph(`<a href="${getEmailAppUrl()}/settings" style="color: #C9A24E; text-decoration: none;">Manage notification preferences</a>`, 'muted')}
  `;

  const html = baseEmailTemplate({
    preheader: message.substring(0, 100),
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  // Send email via shared Resend client
  const emailData = await sendEmail({
    from: EMAIL_SENDERS.notifications,
    to: [userEmail],
    subject: title,
    html,
    headers: getEmailHeaders(),
  });

  console.log("[send-notification-email] Email sent successfully:", emailData);

  return new Response(
    JSON.stringify({ success: true, emailId: emailData.id }),
    { status: 200, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
  );
}));

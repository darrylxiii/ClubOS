import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Card, Heading, Paragraph, Spacer } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, getEmailAppUrl } from "../_shared/email-config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  userId: string;
  notificationId: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  actionLabel?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, notificationId, title, message, type, actionUrl, actionLabel }: NotificationEmailRequest = await req.json();

    console.log("Processing notification email for user:", userId, "type:", type);

    // Get user preferences
    const { data: prefs, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (prefsError) {
      console.error("Error fetching preferences:", prefsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user preferences" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email notifications are enabled
    if (!prefs.email_enabled) {
      console.log("Email notifications disabled for user");
      return new Response(
        JSON.stringify({ message: "Email notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      console.log(`Email notifications disabled for type: ${type}`);
      return new Response(
        JSON.stringify({ message: `Email notifications disabled for type: ${type}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        console.log("Currently in quiet hours, skipping email");
        return new Response(
          JSON.stringify({ message: "In quiet hours" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      console.error("Error fetching user:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      console.error("User has no email");
      return new Response(
        JSON.stringify({ error: "User has no email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_SENDERS.notifications,
        to: [userEmail],
        subject: title,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error(`Resend API error: ${errorData.message || "Unknown error"}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

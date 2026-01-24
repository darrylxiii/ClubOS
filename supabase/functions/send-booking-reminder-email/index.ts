import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { 
  Heading, Paragraph, Spacer, Card, Button, InfoRow 
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailReminderRequest {
  email: string;
  name: string;
  bookingLink?: string;
  booking: {
    id: string;
    scheduled_start: string;
    scheduled_end: string;
    guest_name: string;
    guest_email: string;
    booking_link_id?: string;
    meeting_id?: string;
    notes?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, name, bookingLink, booking }: EmailReminderRequest = await req.json();

    console.log(`Processing email reminder for booking: ${booking.id} to ${email}`);

    // Fetch additional booking details if needed
    let hostName = "Your Host";
    let meetingTitle = "Your Meeting";

    if (booking.booking_link_id) {
      const { data: linkData } = await supabase
        .from("booking_links")
        .select("title, duration_minutes, user_id, profiles:user_id(full_name)")
        .eq("id", booking.booking_link_id)
        .single();

      if (linkData) {
        meetingTitle = linkData.title || meetingTitle;
        hostName = (linkData.profiles as any)?.full_name || hostName;
      }
    }

    // Format the scheduled time
    const scheduledDate = new Date(booking.scheduled_start);
    const formattedDate = scheduledDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const endDate = new Date(booking.scheduled_end);
    const formattedEndTime = endDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const appUrl = getEmailAppUrl();
    const manageUrl = `${appUrl}/bookings/${booking.id}`;

    // Build email content using components
    const emailContent = `
      ${Heading({ text: '⏰ Meeting Reminder', level: 1 })}
      ${Spacer(16)}
      ${Paragraph(`Hi ${name},`, 'primary')}
      ${Spacer(8)}
      ${Paragraph('This is a friendly reminder about your upcoming meeting:', 'secondary')}
      ${Spacer(24)}
      
      ${Card({
        variant: 'highlight',
        content: `
          <h2 style="margin: 0 0 16px 0; font-size: 20px; color: ${EMAIL_COLORS.ivory};">${meetingTitle}</h2>
          ${InfoRow({ icon: '👤', label: 'With', value: hostName })}
          ${InfoRow({ icon: '📅', label: 'When', value: formattedDate })}
          ${InfoRow({ icon: '🕐', label: 'Time', value: `${formattedTime} - ${formattedEndTime}` })}
        `
      })}
      
      ${booking.notes ? `
        ${Spacer(16)}
        ${Card({
          variant: 'default',
          content: `<p style="margin: 0; font-size: 14px;"><strong>Notes:</strong> ${booking.notes}</p>`
        })}
      ` : ''}
      
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ url: manageUrl, text: 'View Booking Details', variant: 'primary' })}
          </td>
        </tr>
      </table>
      
      ${Spacer(24)}
      ${Paragraph(`Need to make changes? <a href="${manageUrl}" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">Manage your booking</a>`, 'muted')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: `Reminder: ${meetingTitle} with ${hostName} - ${formattedDate}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    // Send the email
    const emailResponse = await resend.emails.send({
      from: EMAIL_SENDERS.reminders,
      to: [email],
      subject: `Reminder: ${meetingTitle} with ${hostName} - ${formattedDate}`,
      html: htmlContent,
    });

    console.log("Email reminder sent successfully:", emailResponse);

    // Log the reminder
    await supabase
      .from("booking_reminder_logs")
      .insert({
        booking_id: booking.id,
        reminder_type: "email",
        sent_at: new Date().toISOString(),
        status: "sent",
        metadata: {
          resend_id: emailResponse.data?.id,
          recipient: email,
        },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email reminder sent",
        id: emailResponse.data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending email reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email reminder" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

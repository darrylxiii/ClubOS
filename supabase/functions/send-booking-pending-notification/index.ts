import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { 
  Heading, Paragraph, Spacer, Card, Button, InfoRow, StatusBadge 
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingNotificationRequest {
  bookingId: string;
  guestEmail: string;
  guestName: string;
  hostEmail: string;
  hostName: string;
  bookingTitle: string;
  scheduledStart: string;
  scheduledEnd: string;
  approvalToken?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-booking-pending-notification] Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PendingNotificationRequest = await req.json();
    console.log("[send-booking-pending-notification] Payload:", JSON.stringify(payload, null, 2));

    const {
      bookingId,
      guestEmail,
      guestName,
      hostEmail,
      hostName,
      bookingTitle,
      scheduledStart,
      scheduledEnd,
      approvalToken,
    } = payload;

    // Format dates for display
    const startDate = new Date(scheduledStart);
    const endDate = new Date(scheduledEnd);
    const formattedDate = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedStartTime = startDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedEndTime = endDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Generate approval link
    const baseUrl = getEmailAppUrl();
    const approvalLink = `${baseUrl}/booking/approve/${bookingId}${approvalToken ? `?token=${approvalToken}` : ""}`;

    // Store notification record
    await supabase.from("notification_logs").insert({
      type: "booking_pending_approval",
      recipient_email: guestEmail,
      metadata: {
        booking_id: bookingId,
        host_email: hostEmail,
        scheduled_start: scheduledStart,
      },
    });

    // Send emails if Resend is configured
    if (resendApiKey) {
      const { Resend } = await import("https://esm.sh/resend@2.0.0");
      const resend = new Resend(resendApiKey);

      // Email to guest - booking is pending
      const guestContent = `
        ${Heading({ text: 'Booking Request Received', level: 1 })}
        ${Spacer(16)}
        ${Paragraph(`Hi ${guestName},`, 'primary')}
        ${Spacer(8)}
        ${Paragraph(`Thank you for your booking request with <strong>${hostName}</strong>.`, 'secondary')}
        ${Spacer(24)}
        
        ${Card({
          variant: 'default',
          content: `
            ${StatusBadge({ status: 'pending' })}
            <h3 style="margin: 16px 0; color: ${EMAIL_COLORS.ivory};">${bookingTitle}</h3>
            ${InfoRow({ icon: '📅', label: 'Date', value: formattedDate })}
            ${InfoRow({ icon: '🕐', label: 'Time', value: `${formattedStartTime} - ${formattedEndTime}` })}
            ${InfoRow({ icon: '👤', label: 'Host', value: hostName })}
          `
        })}
        
        ${Spacer(24)}
        ${Paragraph("We'll send you a confirmation email once your booking has been approved. This usually takes less than 24 hours.", 'secondary')}
        ${Spacer(16)}
        ${Paragraph("If you have any questions, you can reply to this email.", 'muted')}
        ${Spacer(24)}
        ${Paragraph('Best regards,<br>The Quantum Club Team', 'secondary')}
      `;

      const guestHtml = baseEmailTemplate({
        preheader: `Your booking with ${hostName} is pending approval`,
        content: guestContent,
        showHeader: true,
        showFooter: true,
      });

      const guestEmailResult = await resend.emails.send({
        from: EMAIL_SENDERS.bookings,
        to: [guestEmail],
        subject: `Booking Request Received - ${bookingTitle}`,
        html: guestHtml,
      });

      console.log("[send-booking-pending-notification] Guest email sent:", guestEmailResult);

      // Email to host - approval needed
      const hostContent = `
        ${Heading({ text: 'New Booking Request', level: 1 })}
        ${Spacer(16)}
        ${Paragraph(`Hi ${hostName},`, 'primary')}
        ${Spacer(8)}
        ${Paragraph('You have a new booking request that needs your approval:', 'secondary')}
        ${Spacer(24)}
        
        ${Card({
          variant: 'highlight',
          content: `
            <h3 style="margin: 0 0 16px 0; color: ${EMAIL_COLORS.ivory};">${bookingTitle}</h3>
            ${InfoRow({ icon: '👤', label: 'Guest', value: guestName })}
            ${InfoRow({ icon: '📧', label: 'Email', value: guestEmail })}
            ${InfoRow({ icon: '📅', label: 'Date', value: formattedDate })}
            ${InfoRow({ icon: '🕐', label: 'Time', value: `${formattedStartTime} - ${formattedEndTime}` })}
          `
        })}
        
        ${Spacer(32)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center">
              ${Button({ url: approvalLink, text: '✓ Approve Booking', variant: 'primary' })}
            </td>
          </tr>
        </table>
        
        ${Spacer(24)}
        ${Paragraph(`Or manage this request in your <a href="${baseUrl}/scheduling" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">scheduling dashboard</a>.`, 'muted')}
      `;

      const hostHtml = baseEmailTemplate({
        preheader: `Action required: ${guestName} wants to book ${bookingTitle}`,
        content: hostContent,
        showHeader: true,
        showFooter: true,
      });

      const hostEmailResult = await resend.emails.send({
        from: EMAIL_SENDERS.bookings,
        to: [hostEmail],
        subject: `⚡ Approval Needed: ${guestName} wants to book ${bookingTitle}`,
        html: hostHtml,
      });

      console.log("[send-booking-pending-notification] Host email sent:", hostEmailResult);

      return new Response(
        JSON.stringify({
          success: true,
          guestEmailId: guestEmailResult.data?.id,
          hostEmailId: hostEmailResult.data?.id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      console.log("[send-booking-pending-notification] RESEND_API_KEY not configured, skipping emails");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Notification logged but emails not sent (RESEND_API_KEY not configured)",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("[send-booking-pending-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

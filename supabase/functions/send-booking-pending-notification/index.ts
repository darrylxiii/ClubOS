import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

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
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://app.thequantumclub.com";
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
      const guestEmailResult = await resend.emails.send({
        from: "The Quantum Club <bookings@thequantumclub.com>",
        to: [guestEmail],
        subject: `Booking Request Received - ${bookingTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; }
              .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; color: #666; }
              .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
              .detail-row { display: flex; margin: 10px 0; }
              .detail-label { font-weight: 600; width: 100px; color: #666; }
              .detail-value { color: #333; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">Booking Request Received</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Your booking is pending approval</p>
              </div>
              <div class="content">
                <p>Hi ${guestName},</p>
                <p>Thank you for your booking request with <strong>${hostName}</strong>.</p>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 15px;"><span class="badge">⏳ Pending Approval</span></p>
                  <h3 style="margin: 0 0 15px; color: #111;">${bookingTitle}</h3>
                  <div class="detail-row">
                    <span class="detail-label">📅 Date:</span>
                    <span class="detail-value">${formattedDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">🕐 Time:</span>
                    <span class="detail-value">${formattedStartTime} - ${formattedEndTime}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">👤 Host:</span>
                    <span class="detail-value">${hostName}</span>
                  </div>
                </div>
                
                <p>We'll send you a confirmation email once your booking has been approved. This usually takes less than 24 hours.</p>
                
                <p>If you have any questions, you can reply to this email.</p>
                
                <p>Best regards,<br>The Quantum Club Team</p>
              </div>
              <div class="footer">
                <p>Powered by The Quantum Club</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log("[send-booking-pending-notification] Guest email sent:", guestEmailResult);

      // Email to host - approval needed
      const hostEmailResult = await resend.emails.send({
        from: "The Quantum Club <bookings@thequantumclub.com>",
        to: [hostEmail],
        subject: `⚡ Approval Needed: ${guestName} wants to book ${bookingTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; }
              .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; color: #666; }
              .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 5px; }
              .btn-approve { background: #22c55e; color: white; }
              .btn-decline { background: #ef4444; color: white; }
              .detail-row { display: flex; margin: 10px 0; }
              .detail-label { font-weight: 600; width: 100px; color: #666; }
              .detail-value { color: #333; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">New Booking Request</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Action required</p>
              </div>
              <div class="content">
                <p>Hi ${hostName},</p>
                <p>You have a new booking request that needs your approval:</p>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px; color: #111;">${bookingTitle}</h3>
                  <div class="detail-row">
                    <span class="detail-label">👤 Guest:</span>
                    <span class="detail-value">${guestName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">📧 Email:</span>
                    <span class="detail-value">${guestEmail}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">📅 Date:</span>
                    <span class="detail-value">${formattedDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">🕐 Time:</span>
                    <span class="detail-value">${formattedStartTime} - ${formattedEndTime}</span>
                  </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${approvalLink}" class="btn btn-approve">✓ Approve Booking</a>
                </div>
                
                <p style="font-size: 14px; color: #666;">Or manage this request in your <a href="${baseUrl}/scheduling">scheduling dashboard</a>.</p>
              </div>
              <div class="footer">
                <p>Powered by The Quantum Club</p>
              </div>
            </div>
          </body>
          </html>
        `,
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    let bookingDetails = booking;
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

    const appUrl = Deno.env.get("APP_URL") || "https://thequantumclub.com";
    const manageUrl = `${appUrl}/bookings/${booking.id}`;

    // Generate email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Reminder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #0E0E10 0%, #1a1a1a 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: #C9A24E; margin: 0; font-size: 24px; font-weight: 600;">
            ⏰ Meeting Reminder
          </h1>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #333;">Hi ${name},</p>
          
          <p style="font-size: 16px; color: #333;">
            This is a friendly reminder about your upcoming meeting:
          </p>
          
          <div style="background: #f8f8f8; border-left: 4px solid #C9A24E; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <h2 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 20px;">${meetingTitle}</h2>
            <p style="margin: 8px 0; color: #666;">
              <strong>With:</strong> ${hostName}
            </p>
            <p style="margin: 8px 0; color: #666;">
              <strong>When:</strong> ${formattedDate}
            </p>
            <p style="margin: 8px 0; color: #666;">
              <strong>Time:</strong> ${formattedTime} - ${formattedEndTime}
            </p>
          </div>
          
          ${booking.notes ? `
          <div style="background: #fff9e6; border-left: 4px solid #f5a623; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>Notes:</strong> ${booking.notes}
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${manageUrl}" style="display: inline-block; background: linear-gradient(135deg, #C9A24E 0%, #a8863c 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Booking Details
            </a>
          </div>
          
          <p style="font-size: 14px; color: #888; margin-top: 32px; text-align: center;">
            Need to make changes? <a href="${manageUrl}" style="color: #C9A24E;">Manage your booking</a>
          </p>
        </div>
        
        <div style="text-align: center; padding: 24px; color: #888; font-size: 12px;">
          <p style="margin: 0;">The Quantum Club</p>
        </div>
      </body>
      </html>
    `;

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "The Quantum Club <reminders@thequantumclub.com>",
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

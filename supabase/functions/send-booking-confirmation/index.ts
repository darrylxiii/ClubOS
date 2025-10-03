import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking, bookingLink } = await req.json();

    const startDate = new Date(booking.scheduled_start);
    const endDate = new Date(booking.scheduled_end);
    
    const formattedDate = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const formattedTime = `${startDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${endDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const confirmationMessage = bookingLink.confirmation_message || 
      `Your meeting has been scheduled for ${formattedDate} at ${formattedTime}.`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${bookingLink.color};">${bookingLink.title}</h1>
        <p>Hi ${booking.guest_name},</p>
        <p>${confirmationMessage}</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">Meeting Details</h2>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime} (${booking.timezone})</p>
          ${bookingLink.description ? `<p><strong>Description:</strong> ${bookingLink.description}</p>` : ""}
          ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ""}
        </div>
        
        <p style="color: #666; font-size: 14px;">
          If you need to cancel or reschedule, please contact us as soon as possible.
        </p>
      </div>
    `;

    // Send email using Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Quantum Club <onboarding@resend.dev>",
        to: [booking.guest_email],
        subject: `Meeting Confirmed: ${bookingLink.title}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Confirmation email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
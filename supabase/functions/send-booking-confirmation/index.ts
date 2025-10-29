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

    // Generate .ics calendar file content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Quantum Club//Booking System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `UID:${booking.id}@quantumclub.com`,
      `SUMMARY:${bookingLink.title}`,
      `DESCRIPTION:${bookingLink.description || 'Meeting scheduled via Quantum Club'}`,
      `ORGANIZER;CN=Quantum Club:MAILTO:no-reply@quantumclub.com`,
      `ATTENDEE;CN=${booking.guest_name};RSVP=TRUE:MAILTO:${booking.guest_email}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Generate Add to Calendar URLs
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(bookingLink.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(bookingLink.description || '')}`;
    const outlookCalUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(bookingLink.title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(bookingLink.description || '')}`;

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

        <div style="text-align: center; margin: 30px 0;">
          <h3 style="margin-bottom: 15px;">Add to Your Calendar</h3>
          <div style="display: inline-block;">
            <a href="${googleCalUrl}" style="display: inline-block; padding: 12px 24px; margin: 5px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
              📅 Google Calendar
            </a>
            <a href="${outlookCalUrl}" style="display: inline-block; padding: 12px 24px; margin: 5px; background-color: #0078d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
              📅 Outlook
            </a>
          </div>
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
        attachments: [
          {
            filename: "meeting.ics",
            content: btoa(icsContent),
            content_type: "text/calendar; method=REQUEST",
          },
        ],
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
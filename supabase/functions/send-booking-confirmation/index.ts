import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { 
  Button, Card, Heading, Paragraph, Spacer, InfoRow, 
  VideoCallCard, StatusBadge, CalendarButtons, AlertBox, SchemaEvent 
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, SUPPORT_EMAIL, getEmailAppUrl } from "../_shared/email-config.ts";
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";

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
    // Rate limiting: 5 requests per minute per IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    const rateLimitResult = await checkUserRateLimit(clientIp, "send-booking-confirmation", 5, 60000);
    if (!rateLimitResult.allowed) {
      console.log(`[Booking Confirmation] Rate limit exceeded for IP: ${clientIp}`);
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    const { booking, bookingLink } = await req.json();
    
    // Initialize Supabase client to fetch owner profile
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const appUrl = getEmailAppUrl();
    
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${bookingLink.user_id}&select=email,full_name`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
    });
    
    const profiles = await response.json();
    const ownerProfile = profiles[0];
    
    if (!ownerProfile?.email) {
      console.error("Owner profile not found for user_id:", bookingLink.user_id);
    }

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
      `Your meeting with ${ownerProfile?.full_name || 'your host'} has been confirmed.`;

    // Determine video platform and meeting link
    const activePlatform = booking.active_video_platform;
    let meetingLink = '';
    let platformName = '';
    let platformType: 'google_meet' | 'zoom' | 'club_meetings' | 'teams' | 'generic' = 'generic';
    let meetingInstructions = '';
    let hasMeetingLink = false;

    if (activePlatform === 'google_meet' && booking.google_meet_hangout_link) {
      meetingLink = booking.google_meet_hangout_link;
      platformName = 'Google Meet';
      platformType = 'google_meet';
      meetingInstructions = 'Join via Google Meet. The link will also be in your calendar invite.';
      hasMeetingLink = true;
    } else if (activePlatform === 'quantum_club' && booking.quantum_meeting_link) {
      meetingLink = booking.quantum_meeting_link;
      platformName = 'Club Meetings';
      platformType = 'club_meetings';
      meetingInstructions = 'Join via The Quantum Club for full-featured video calls with AI intelligence.';
      hasMeetingLink = true;
    } else if (booking.video_meeting_link) {
      meetingLink = booking.video_meeting_link;
      platformName = 'Video Conference';
      platformType = 'generic';
      meetingInstructions = 'Join the meeting using the link below.';
      hasMeetingLink = true;
    }

    // Build meeting location for ICS and calendar
    const meetingLocation = hasMeetingLink ? meetingLink : '';
    const enhancedDescription = hasMeetingLink 
      ? `${bookingLink.description || 'Meeting scheduled via The Quantum Club'}\n\nJoin ${platformName}: ${meetingLink}`
      : bookingLink.description || 'Meeting scheduled via The Quantum Club';

    // Generate .ics calendar file content
    const attendeesList = [
      `ATTENDEE;CN=${ownerProfile?.full_name || 'Host'};ROLE=REQ-PARTICIPANT:MAILTO:${ownerProfile?.email}`,
      `ATTENDEE;CN=${booking.guest_name};RSVP=TRUE:MAILTO:${booking.guest_email}`,
    ];

    if (booking.guests && Array.isArray(booking.guests)) {
      booking.guests.forEach((guest: any) => {
        if (guest.email) {
          attendeesList.push(`ATTENDEE;CN=${guest.name || guest.email};RSVP=TRUE:MAILTO:${guest.email}`);
        }
      });
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The Quantum Club//Booking System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `UID:${booking.id}@thequantumclub.com`,
      `SUMMARY:${bookingLink.title}`,
      `DESCRIPTION:${enhancedDescription.replace(/\n/g, '\\n')}`,
      ...(meetingLocation ? [`LOCATION:${meetingLocation}`] : []),
      `ORGANIZER;CN=${ownerProfile?.full_name || 'The Quantum Club'}:MAILTO:${ownerProfile?.email || 'noreply@thequantumclub.nl'}`,
      ...attendeesList,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Generate Schema.org markup for Gmail rich previews
    const schemaMarkup = SchemaEvent({
      name: bookingLink.title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      location: meetingLocation,
      description: bookingLink.description,
      organizerName: ownerProfile?.full_name || 'The Quantum Club',
      organizerEmail: ownerProfile?.email,
      attendees: [
        { name: booking.guest_name, email: booking.guest_email },
      ],
    });

    // Build the email content with new professional components
    const emailContent = `
      ${StatusBadge({ status: 'confirmed', text: 'BOOKING CONFIRMED' })}
      ${Heading({ text: bookingLink.title, level: 1, align: 'center' })}
      ${Spacer(24)}
      ${Paragraph(`Hi ${booking.guest_name},`, 'primary')}
      ${Spacer(8)}
      ${Paragraph(confirmationMessage, 'secondary')}
      ${Spacer(32)}
      ${Card({
        variant: 'highlight',
        content: `
          ${Heading({ text: 'Meeting Details', level: 2 })}
          ${Spacer(16)}
          ${InfoRow({ icon: '👤', label: 'Host', value: ownerProfile?.full_name || 'Your Host' })}
          ${InfoRow({ icon: '📅', label: 'Date', value: formattedDate })}
          ${InfoRow({ icon: '🕐', label: 'Time', value: `${formattedTime} (${booking.timezone})` })}
          ${InfoRow({ icon: '⏱️', label: 'Duration', value: `${bookingLink.duration_minutes} minutes` })}
          ${bookingLink.description ? InfoRow({ icon: '📝', label: 'Description', value: bookingLink.description }) : ''}
          ${booking.notes ? InfoRow({ icon: '💬', label: 'Your Notes', value: booking.notes }) : ''}
        `
      })}
      ${Spacer(24)}
      ${hasMeetingLink ? VideoCallCard({
        platform: platformType,
        platformName: platformName,
        joinUrl: meetingLink,
        instructions: meetingInstructions,
      }) : ''}
      ${Spacer(24)}
      ${CalendarButtons({
        title: bookingLink.title,
        startDate: startDate,
        endDate: endDate,
        description: enhancedDescription,
        location: meetingLocation,
      })}
      ${Spacer(24)}
      ${AlertBox({
        type: 'info',
        title: 'Need to make changes?',
        message: `If you need to cancel or reschedule, please contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">${SUPPORT_EMAIL}</a>`,
      })}
    `;

    const emailHtml = baseEmailTemplate({
      preheader: `Meeting confirmed: ${bookingLink.title} • ${formattedDate} at ${formattedTime}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
      schemaMarkup: schemaMarkup,
    });

    // Send email to GUEST
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const guestEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: EMAIL_SENDERS.bookings,
        to: [booking.guest_email],
        subject: `✓ Confirmed: ${bookingLink.title} - ${formattedDate}`,
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

    const guestEmailResult = await guestEmailResponse.json();
    console.log("Guest confirmation email sent:", guestEmailResult);

    // Send emails to ADDITIONAL GUESTS
    if (booking.guests && Array.isArray(booking.guests) && booking.guests.length > 0) {
      for (const guest of booking.guests) {
        if (guest.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: EMAIL_SENDERS.bookings,
              to: [guest.email],
              subject: `You're invited: ${bookingLink.title} - ${formattedDate}`,
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
          console.log(`Additional guest email sent to ${guest.email}`);
        }
      }
    }

    // Send email to OWNER (booking link creator)
    if (ownerProfile?.email) {
      const ownerEmailContent = `
        ${StatusBadge({ status: 'new', text: 'NEW BOOKING' })}
        ${Heading({ text: `New Booking: ${bookingLink.title}`, level: 1, align: 'center' })}
        ${Spacer(24)}
        ${Paragraph(`Hi ${ownerProfile.full_name || 'there'},`, 'primary')}
        ${Spacer(8)}
        ${Paragraph(`You have a new booking from <strong>${booking.guest_name}</strong>.`, 'secondary')}
        ${Spacer(32)}
        ${Card({
          variant: 'highlight',
          content: `
            ${Heading({ text: 'Booking Details', level: 2 })}
            ${Spacer(16)}
            ${InfoRow({ icon: '👤', label: 'Guest', value: booking.guest_name })}
            ${InfoRow({ icon: '📧', label: 'Email', value: booking.guest_email })}
            ${booking.guest_phone ? InfoRow({ icon: '📱', label: 'Phone', value: booking.guest_phone }) : ''}
            ${InfoRow({ icon: '📅', label: 'Date', value: formattedDate })}
            ${InfoRow({ icon: '🕐', label: 'Time', value: `${formattedTime} (${booking.timezone})` })}
            ${InfoRow({ icon: '⏱️', label: 'Duration', value: `${bookingLink.duration_minutes} minutes` })}
            ${booking.notes ? InfoRow({ icon: '💬', label: 'Guest Notes', value: booking.notes }) : ''}
          `
        })}
        ${Spacer(24)}
        ${hasMeetingLink ? VideoCallCard({
          platform: platformType,
          platformName: platformName,
          joinUrl: meetingLink,
          instructions: 'Click below to join when the meeting starts.',
        }) : ''}
        ${Spacer(24)}
        ${CalendarButtons({
          title: bookingLink.title,
          startDate: startDate,
          endDate: endDate,
          description: enhancedDescription,
          location: meetingLocation,
        })}
      `;

      const ownerEmailHtml = baseEmailTemplate({
        preheader: `New booking from ${booking.guest_name} • ${formattedDate} at ${formattedTime}`,
        content: ownerEmailContent,
        showHeader: true,
        showFooter: true,
        schemaMarkup: schemaMarkup,
      });

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: EMAIL_SENDERS.bookings,
          to: [ownerProfile.email],
          subject: `📅 New Booking: ${booking.guest_name} - ${bookingLink.title}`,
          html: ownerEmailHtml,
          attachments: [
            {
              filename: "meeting.ics",
              content: btoa(icsContent),
              content_type: "text/calendar; method=REQUEST",
            },
          ],
        }),
      });

      console.log("Owner confirmation email sent");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation emails sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending booking confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

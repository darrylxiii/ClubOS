import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  invitationId: string;
  inviteeEmail: string;
  inviterName: string;
  meetingTitle: string;
  meetingStartTime: string;
  meetingDuration: number;
  meetingUrl: string;
}

const generateICS = (
  title: string,
  startTime: string,
  duration: number,
  url: string
): string => {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60000);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//The Quantum Club//Meeting Invitation//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${crypto.randomUUID()}@thequantumclub.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${title}
DESCRIPTION:Join the meeting at: ${url}
URL:${url}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
};

const generateEmailHTML = (
  inviterName: string,
  meetingTitle: string,
  startTime: string,
  duration: number,
  acceptUrl: string,
  declineUrl: string,
  meetingUrl: string
): string => {
  const start = new Date(startTime);
  const formattedDate = start.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0E0E10; color: #F5F4EF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0E0E10;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1A1A1D 0%, #0E0E10 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(201, 162, 78, 0.2);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(90deg, rgba(201, 162, 78, 0.1) 0%, rgba(201, 162, 78, 0.05) 50%, transparent 100%); padding: 32px; border-bottom: 1px solid rgba(201, 162, 78, 0.1);">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #F5F4EF;">Meeting Invitation</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(245, 244, 239, 0.6);">You've been invited to a meeting</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; color: rgba(245, 244, 239, 0.8);">
                <strong style="color: #C9A24E;">${inviterName}</strong> has invited you to:
              </p>
              
              <div style="background: rgba(201, 162, 78, 0.05); border-left: 3px solid #C9A24E; padding: 20px; margin: 0 0 24px 0; border-radius: 8px;">
                <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #F5F4EF;">${meetingTitle}</h2>
                
                <table cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: rgba(245, 244, 239, 0.7);">
                      📅 <strong>When:</strong>
                    </td>
                    <td style="padding: 8px 0; font-size: 14px; color: #F5F4EF; text-align: right;">
                      ${formattedDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: rgba(245, 244, 239, 0.7);">
                      🕐 <strong>Time:</strong>
                    </td>
                    <td style="padding: 8px 0; font-size: 14px; color: #F5F4EF; text-align: right;">
                      ${formattedTime}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: rgba(245, 244, 239, 0.7);">
                      ⏱️ <strong>Duration:</strong>
                    </td>
                    <td style="padding: 8px 0; font-size: 14px; color: #F5F4EF; text-align: right;">
                      ${duration} minutes
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Action Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 16px 0;">
                    <a href="${acceptUrl}" style="display: inline-block; background: #C9A24E; color: #0E0E10; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      ✓ Accept & Join Meeting
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0 0 16px 0;">
                    <a href="${declineUrl}" style="display: inline-block; background: rgba(201, 162, 78, 0.1); color: #F5F4EF; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; border: 1px solid rgba(201, 162, 78, 0.2);">
                      Decline
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(201, 162, 78, 0.1);">
                <p style="margin: 0; font-size: 13px; color: rgba(245, 244, 239, 0.5); text-align: center;">
                  Can't make it? <a href="${declineUrl}" style="color: #C9A24E; text-decoration: none;">Let us know</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(201, 162, 78, 0.03); padding: 24px; border-top: 1px solid rgba(201, 162, 78, 0.1); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: rgba(245, 244, 239, 0.4);">
                The Quantum Club • Exclusive Talent Platform<br>
                <a href="${meetingUrl}" style="color: #C9A24E; text-decoration: none;">View in app</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const emailData: EmailRequest = await req.json();
    
    const acceptUrl = `${Deno.env.get('APP_URL')}/api/meeting-response?id=${emailData.invitationId}&action=accept`;
    const declineUrl = `${Deno.env.get('APP_URL')}/api/meeting-response?id=${emailData.invitationId}&action=decline`;

    const icsContent = generateICS(
      emailData.meetingTitle,
      emailData.meetingStartTime,
      emailData.meetingDuration,
      emailData.meetingUrl
    );

    const htmlContent = generateEmailHTML(
      emailData.inviterName,
      emailData.meetingTitle,
      emailData.meetingStartTime,
      emailData.meetingDuration,
      acceptUrl,
      declineUrl,
      emailData.meetingUrl
    );

    // Actually send the email via Resend
    if (resendApiKey) {
      console.log('[send-meeting-invitation-email] Sending email via Resend to:', emailData.inviteeEmail);
      
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'The Quantum Club <meetings@thequantumclub.com>',
          to: [emailData.inviteeEmail],
          subject: `Meeting Invitation: ${emailData.meetingTitle}`,
          html: htmlContent,
          attachments: [
            {
              filename: 'meeting.ics',
              content: btoa(icsContent),
              type: 'text/calendar',
            }
          ],
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('[send-meeting-invitation-email] Resend error:', errorText);
        throw new Error(`Failed to send email: ${errorText}`);
      }

      const emailResult = await emailResponse.json();
      console.log('[send-meeting-invitation-email] Email sent successfully:', emailResult.id);
    } else {
      console.log('[send-meeting-invitation-email] RESEND_API_KEY not configured, skipping email send');
      console.log('[send-meeting-invitation-email] Would send email to:', emailData.inviteeEmail);
    }

    // Update notification queue status
    await supabase
      .from('meeting_notification_queue')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('meeting_invitation_id', emailData.invitationId)
      .eq('notification_type', 'email');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: resendApiKey ? 'Email sent successfully' : 'Email queued (no API key)',
        icsAttachment: btoa(icsContent)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[send-meeting-invitation-email] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

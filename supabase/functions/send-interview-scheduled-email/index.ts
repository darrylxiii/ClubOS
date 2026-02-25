import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailHeaders, htmlToPlainText } from "../_shared/email-config.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, InfoRow, StatusBadge,
  MeetingPrepCard, CalendarButtons,
} from "../_shared/email-templates/components.ts";
import { getAppUrl } from "../_shared/app-config.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InterviewScheduledRequest {
  candidateEmail: string;
  candidateName: string;
  companyName: string;
  jobTitle: string;
  interviewerName?: string;
  scheduledStart: string; // ISO date
  scheduledEnd: string;   // ISO date
  meetingLink?: string;
  interviewType?: string; // 'phone_screen' | 'technical' | 'panel' | 'final'
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: InterviewScheduledRequest = await req.json();
    const { candidateEmail, candidateName, companyName, jobTitle, interviewerName, scheduledStart, scheduledEnd, meetingLink, interviewType, notes } = body;

    if (!candidateEmail || !candidateName || !scheduledStart) {
      throw new Error('Missing required fields');
    }

    const appUrl = getAppUrl();
    const startDate = new Date(scheduledStart);
    const endDate = new Date(scheduledEnd || new Date(startDate.getTime() + 60 * 60 * 1000).toISOString());

    const formattedDate = startDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const formattedTime = `${startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

    const interviewLabel = interviewType
      ? interviewType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : 'Interview';

    const emailContent = `
      ${StatusBadge({ status: 'confirmed', text: 'INTERVIEW SCHEDULED' })}
      ${Heading({ text: `Your ${interviewLabel} is Confirmed`, level: 1, align: 'center' })}
      ${Spacer(24)}
      ${Paragraph(`Dear ${candidateName},`, 'primary')}
      ${Spacer(8)}
      ${Paragraph(`Your interview${companyName ? ` with <strong>${companyName}</strong>` : ''} has been scheduled. Here are the details:`, 'secondary')}
      ${Spacer(24)}
      ${Card({
        variant: 'highlight',
        content: `
          ${InfoRow({ icon: '📅', label: 'Date', value: formattedDate })}
          ${InfoRow({ icon: '🕐', label: 'Time', value: formattedTime })}
          ${jobTitle ? InfoRow({ icon: '💼', label: 'Role', value: jobTitle }) : ''}
          ${interviewerName ? InfoRow({ icon: '👤', label: 'Interviewer', value: interviewerName }) : ''}
          ${interviewType ? InfoRow({ icon: '📋', label: 'Type', value: interviewLabel }) : ''}
        `,
      })}
      ${notes ? `
        ${Spacer(16)}
        ${Card({
          variant: 'default',
          content: `
            ${Heading({ text: 'Additional Notes', level: 3 })}
            ${Paragraph(notes, 'secondary')}
          `,
        })}
      ` : ''}
      ${meetingLink ? `
        ${Spacer(24)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td align="center">
            ${Button({ url: meetingLink, text: 'Join Meeting', variant: 'primary' })}
          </td></tr>
        </table>
      ` : ''}
      ${Spacer(24)}
      ${CalendarButtons({
        title: `${interviewLabel} — ${companyName || 'The Quantum Club'}`,
        startDate,
        endDate,
        description: `Interview for ${jobTitle || 'role'}${interviewerName ? ` with ${interviewerName}` : ''}`,
        location: meetingLink || '',
      })}
      ${Spacer(24)}
      ${MeetingPrepCard({
        meetingType: 'interview',
        companyName,
        interviewerName,
      })}
      ${Spacer(16)}
      ${Paragraph('Need to reschedule? Contact your strategist as soon as possible.', 'muted')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: `Your interview${companyName ? ` with ${companyName}` : ''} is confirmed for ${formattedDate}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Email service not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_SENDERS.bookings,
        to: [candidateEmail],
        subject: `Interview Confirmed — ${companyName || jobTitle || 'The Quantum Club'}`,
        html: htmlContent,
        text: htmlToPlainText(htmlContent),
        headers: getEmailHeaders(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    const result = await res.json();
    console.log('[send-interview-scheduled-email] Sent:', result.id);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[send-interview-scheduled-email] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

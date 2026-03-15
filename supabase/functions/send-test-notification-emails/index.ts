import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Card, Button, InfoRow, StatusBadge, Spacer, Divider, AlertBox } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, getEmailHeaders, htmlToPlainText, getEmailAppUrl, EMAIL_COLORS } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RECIPIENT = "darryl@thequantumclub.nl";

async function sendEmail(subject: string, html: string, from: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from,
      to: [RECIPIENT],
      subject,
      html,
      text: htmlToPlainText(html),
      headers: getEmailHeaders(),
    }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appUrl = getEmailAppUrl();
    const results: Record<string, any> = {};

    // 1. Stage Change — Interview
    const stageChangeHtml = baseEmailTemplate({
      preheader: "Senior Product Designer at Stripe — You've been selected for an interview",
      content: `
        ${StatusBadge({ status: 'confirmed', text: 'INTERVIEW' })}
        ${Heading({ text: 'Application Update', level: 1 })}
        ${Spacer(8)}
        ${Card({
          content: `
            ${InfoRow({ label: 'Position', value: 'Senior Product Designer' })}
            ${InfoRow({ label: 'Company', value: 'Stripe' })}
          `,
          variant: 'default',
        })}
        ${Spacer(16)}
        ${Paragraph("Great news — you've been selected for an interview. Our team was impressed with your profile and would love to learn more about your experience.")}
        ${Spacer(16)}
        <div style="text-align: center;">
          ${Button({ url: `${appUrl}/applications`, text: 'View Application' })}
        </div>
      `,
    });
    results['1_stage_change'] = await sendEmail(
      "Application Update: Senior Product Designer at Stripe",
      stageChangeHtml,
      EMAIL_SENDERS.notifications
    );

    // 2. Job Match
    const jobMatchHtml = baseEmailTemplate({
      preheader: "New match: Head of Engineering at Adyen — 87% match",
      content: `
        ${Heading({ text: 'New Job Match', level: 1 })}
        ${Paragraph('We found a role that aligns with your profile and preferences.')}
        ${Spacer(8)}
        ${Card({
          content: `
            ${Heading({ text: 'Head of Engineering', level: 2 })}
            ${InfoRow({ label: 'Company', value: 'Adyen' })}
            ${InfoRow({ label: 'Match Score', value: '87%' })}
          `,
          variant: 'highlight',
        })}
        ${Spacer(16)}
        ${Heading({ text: 'Why this matches', level: 3 })}
        ${InfoRow({ label: '✓', value: '7/9 skills overlap' })}
        ${InfoRow({ label: '✓', value: 'Compensation in range' })}
        ${InfoRow({ label: '✓', value: 'Growth-stage fit' })}
        ${Spacer(16)}
        <div style="text-align: center;">
          ${Button({ url: `${appUrl}/jobs`, text: 'View Role' })}
        </div>
      `,
    });
    results['2_job_match'] = await sendEmail(
      "New Job Match: Head of Engineering at Adyen",
      jobMatchHtml,
      EMAIL_SENDERS.notifications
    );

    // 3. Interview Cancelled
    const cancelledHtml = baseEmailTemplate({
      preheader: "Your interview for Backend Engineer at Booking.com has been cancelled",
      content: `
        ${StatusBadge({ status: 'cancelled', text: 'CANCELLED' })}
        ${Heading({ text: 'Interview Cancelled', level: 1 })}
        ${Spacer(8)}
        ${Card({
          content: `
            ${InfoRow({ label: 'Role', value: 'Backend Engineer' })}
            ${InfoRow({ label: 'Company', value: 'Booking.com' })}
            ${InfoRow({ label: 'Reason', value: 'Position filled internally' })}
          `,
          variant: 'warning',
        })}
        ${Spacer(16)}
        ${Paragraph("Your interview for Backend Engineer at Booking.com has been cancelled. Reason: Position filled internally. Your strategist will be in touch with alternative opportunities.")}
        ${Spacer(16)}
        <div style="text-align: center;">
          ${Button({ url: `${appUrl}/meetings`, text: 'View Details' })}
        </div>
      `,
    });
    results['3_interview_cancelled'] = await sendEmail(
      "Interview Cancelled: Backend Engineer at Booking.com",
      cancelledHtml,
      EMAIL_SENDERS.notifications
    );

    // 4. Interview Rescheduled
    const rescheduledHtml = baseEmailTemplate({
      preheader: "Your interview for Product Manager at Klarna has been rescheduled",
      content: `
        ${StatusBadge({ status: 'pending', text: 'RESCHEDULED' })}
        ${Heading({ text: 'Interview Rescheduled', level: 1 })}
        ${Spacer(8)}
        ${Card({
          content: `
            ${InfoRow({ label: 'Role', value: 'Product Manager' })}
            ${InfoRow({ label: 'Company', value: 'Klarna' })}
            ${InfoRow({ label: 'New Time', value: 'Thursday, 20 March at 14:00 (CET)' })}
          `,
          variant: 'default',
        })}
        ${Spacer(16)}
        ${Paragraph("Your interview for Product Manager at Klarna has been rescheduled to Thursday, 20 March at 14:00 (CET). Please ensure you are available at the new time.")}
        ${Spacer(16)}
        <div style="text-align: center;">
          ${Button({ url: `${appUrl}/meetings`, text: 'View Updated Schedule' })}
        </div>
      `,
    });
    results['4_interview_rescheduled'] = await sendEmail(
      "Interview Rescheduled: Product Manager at Klarna",
      rescheduledHtml,
      EMAIL_SENDERS.notifications
    );

    // 5. Weekly Digest
    const digestHtml = baseEmailTemplate({
      preheader: "Your weekly summary — 3 updates, 2 upcoming meetings",
      content: `
        ${Heading({ text: 'Your Weekly Summary', level: 1 })}
        ${Paragraph('Hello Darryl, here is what happened this week.')}
        ${Spacer(8)}
        ${Heading({ text: 'Application Updates', level: 2 })}
        ${Card({
          content: `
            ${InfoRow({ label: 'Senior Designer', value: 'Stripe · Interview Stage' })}
            ${InfoRow({ label: 'Head of Engineering', value: 'Adyen · Under Review' })}
            ${InfoRow({ label: 'Product Lead', value: 'Mollie · Final Stage' })}
          `,
          variant: 'default',
        })}
        ${Spacer(16)}
        ${Heading({ text: 'Upcoming Meetings', level: 2 })}
        ${Card({
          content: `
            ${InfoRow({ label: 'Stripe Panel Interview', value: 'Tue, 18 Mar 10:00 CET' })}
            ${InfoRow({ label: 'Mollie Final Round', value: 'Thu, 20 Mar 15:00 CET' })}
          `,
          variant: 'default',
        })}
        ${Spacer(24)}
        <div style="text-align: center;">
          ${Button({ url: `${appUrl}/home`, text: 'Go to Dashboard' })}
        </div>
      `,
    });
    results['5_weekly_digest'] = await sendEmail(
      "Your Weekly Summary — The Quantum Club",
      digestHtml,
      EMAIL_SENDERS.notifications
    );

    // 6. Profile Nudge
    const nudgeHtml = baseEmailTemplate({
      preheader: "Your profile is 45% complete — add skills to improve matches",
      content: `
        ${Heading({ text: 'Complete Your Profile', level: 1 })}
        ${Paragraph('Hello Darryl, your profile is currently 45% complete.')}
        ${Spacer(8)}
        ${Card({
          content: `
            <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #0E0E10;">Consider adding:</p>
            ${InfoRow({ label: '○', value: 'Skills' })}
            ${InfoRow({ label: '○', value: 'Work authorization' })}
            ${InfoRow({ label: '○', value: 'Resume' })}
          `,
          variant: 'highlight',
        })}
        ${Spacer(16)}
        ${AlertBox({
          type: 'info',
          message: 'Complete profiles receive significantly more relevant matches and faster recruiter responses.',
        })}
        ${Spacer(16)}
        <div style="text-align: center;">
          ${Button({ url: `${appUrl}/settings?tab=profile`, text: 'Complete Profile' })}
        </div>
      `,
    });
    results['6_profile_nudge'] = await sendEmail(
      "Complete Your Profile — The Quantum Club",
      nudgeHtml,
      EMAIL_SENDERS.notifications
    );

    // 7. Offer Deadline (Urgent)
    const offerHtml = baseEmailTemplate({
      preheader: "Offer expiring in 8h: VP of Product at MessageBird",
      content: `
        ${StatusBadge({ status: 'reminder', text: 'URGENT' })}
        ${Heading({ text: 'Offer Expiring Soon', level: 1 })}
        ${Spacer(8)}
        ${Card({
          content: `
            ${InfoRow({ label: 'Position', value: 'VP of Product' })}
            ${InfoRow({ label: 'Company', value: 'MessageBird' })}
            ${InfoRow({ label: 'Deadline', value: 'Saturday, 15 March at 23:59 CET' })}
            ${InfoRow({ label: 'Time Remaining', value: '8 hours' })}
          `,
          variant: 'warning',
        })}
        ${Spacer(16)}
        ${AlertBox({
          type: 'warning',
          title: 'Action Required',
          message: 'This offer expires in less than 12 hours. Please review and respond as soon as possible.',
        })}
        ${Paragraph('Your offer for VP of Product at MessageBird expires in 8 hours (Saturday, 15 March at 23:59 CET). Please respond before the deadline.')}
        ${Spacer(16)}
        <div style="text-align: center;">
          ${Button({ url: `${appUrl}/applications`, text: 'Review Offer' })}
        </div>
      `,
    });
    results['7_offer_deadline'] = await sendEmail(
      "Offer Expiring Soon: VP of Product at MessageBird",
      offerHtml,
      EMAIL_SENDERS.notifications
    );

    // 8. Strategist Assigned
    const strategistHtml = baseEmailTemplate({
      preheader: "Sarah van der Berg is now your career strategist at The Quantum Club",
      content: `
        ${Heading({ text: 'Meet Your Strategist', level: 1, align: 'center' })}
        ${Spacer(8)}
        ${Card({
          content: `
            <div style="text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 12px;">
                <tr><td style="width: 64px; height: 64px; border-radius: 50%; background-color: ${EMAIL_COLORS.gold}; text-align: center; vertical-align: middle; font-size: 24px; font-weight: 700; color: ${EMAIL_COLORS.eclipse};">
                  S
                </td></tr>
              </table>
              <p style="margin: 0 0 4px; font-size: 18px; font-weight: 600; color: ${EMAIL_COLORS.textPrimary};">Sarah van der Berg</p>
              <p style="margin: 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">Senior Career Strategist</p>
            </div>
          `,
          variant: 'highlight',
        })}
        ${Spacer(16)}
        ${Paragraph('Your dedicated career strategist will help you navigate opportunities, prepare for interviews, and negotiate offers. Feel free to reach out via the messaging feature at any time.')}
        ${Spacer(16)}
        <div style="text-align: center;">
          ${Button({ url: `${appUrl}/messages`, text: 'Send a Message' })}
        </div>
      `,
    });
    results['8_strategist_assigned'] = await sendEmail(
      "Meet Your Strategist: Sarah van der Berg",
      strategistHtml,
      EMAIL_SENDERS.notifications
    );

    return new Response(
      JSON.stringify({ success: true, recipient: RECIPIENT, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-test-emails] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

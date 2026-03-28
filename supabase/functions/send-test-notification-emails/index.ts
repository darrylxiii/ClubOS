import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Card, Button, InfoRow, StatusBadge, Spacer, AlertBox } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, getEmailAppUrl, EMAIL_COLORS } from "../_shared/email-config.ts";
import { sendEmail as sendEmailViaResend } from '../_shared/resend-client.ts';
import { z, parseBody, emailSchema } from '../_shared/validation.ts';

const requestSchema = z.object({
  testEmail: emailSchema.optional(),
});

const DEFAULT_RECIPIENT = "darryl@thequantumclub.nl";

async function sendEmail(subject: string, html: string, from: string, recipient: string) {
  try {
    const result = await sendEmailViaResend({
      from,
      to: [recipient],
      subject,
      html,
    });
    return { status: 200, data: { id: result.id } };
  } catch (error) {
    return { status: 500, data: { error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, requestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const RECIPIENT = parsed.data?.testEmail || DEFAULT_RECIPIENT;

  const appUrl = getEmailAppUrl();
  const results: Record<string, any> = {};

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
    EMAIL_SENDERS.notifications,
    RECIPIENT
  );

  await sleep(600);

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
    EMAIL_SENDERS.notifications,
    RECIPIENT
  );

  await sleep(600);

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
    EMAIL_SENDERS.notifications,
    RECIPIENT
  );

  await sleep(600);

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
    EMAIL_SENDERS.notifications,
    RECIPIENT
  );

  return new Response(
    JSON.stringify({ success: true, recipient: RECIPIENT, results }),
    { headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
  );
}));

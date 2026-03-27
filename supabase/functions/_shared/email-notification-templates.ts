/**
 * Email notification templates for The Quantum Club
 * Uses baseEmailTemplate + component system for consistent branding
 */

import { baseEmailTemplate } from './email-templates/base-template.ts';
import { Heading, Paragraph, Spacer, Card, Button, InfoRow, AlertBox } from './email-templates/components.ts';
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from './email-config.ts';
import { sendEmail as sendEmailViaResend } from './resend-client.ts';

interface MentionEmailData {
  recipientName: string;
  recipientEmail: string;
  mentionedBy: string;
  candidateName: string;
  noteExcerpt: string;
  noteUrl: string;
  appUrl?: string;
}

interface GenericEmailData {
  recipientName: string;
  recipientEmail: string;
  subject: string;
  preheader?: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerText?: string;
}

interface InterviewReminderData {
  recipientName: string;
  recipientEmail: string;
  interviewTitle: string;
  companyName: string;
  scheduledDate: string;
  scheduledTime: string;
  meetingUrl?: string;
  interviewerNames?: string[];
  preparationTips?: string[];
}

/**
 * Generate HTML email for note mention notification
 */
export function generateMentionEmailHTML(data: MentionEmailData): string {
  const appUrl = getEmailAppUrl();
  const content = `
    ${Heading({ text: 'You Were Mentioned', level: 1 })}
    ${Spacer(16)}
    ${Paragraph(`Hi <strong>${data.recipientName}</strong>,`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(`<strong>${data.mentionedBy}</strong> mentioned you in a note about <strong>${data.candidateName}</strong>.`, 'secondary')}
    ${Spacer(16)}
    ${Card({
      variant: 'highlight',
      content: `<em style="color: ${EMAIL_COLORS.textSecondary};">"${data.noteExcerpt}"</em>`,
    })}
    ${Spacer(24)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          ${Button({ url: data.noteUrl, text: 'View Note', variant: 'primary' })}
        </td>
      </tr>
    </table>
  `;

  return baseEmailTemplate({
    preheader: `${data.mentionedBy} mentioned you in a note about ${data.candidateName}`,
    content,
    showHeader: true,
    showFooter: true,
  });
}

/**
 * Generate plain text email for note mention notification
 */
export function generateMentionEmailText(data: MentionEmailData): string {
  const appUrl = getEmailAppUrl();
  return `
You were mentioned in a note

Hi ${data.recipientName},

${data.mentionedBy} mentioned you in a note about ${data.candidateName}.

Note excerpt:
"${data.noteExcerpt}"

View the full note here:
${data.noteUrl}

---
This is an automated notification from The Quantum Club.
Update your notification preferences: ${appUrl}/settings/notifications
  `.trim();
}

/**
 * Generate HTML email for interview reminder
 */
export function generateInterviewReminderEmailHTML(data: InterviewReminderData): string {
  const interviewerInfo = data.interviewerNames && data.interviewerNames.length > 0
    ? InfoRow({ icon: '👤', label: `Interviewer${data.interviewerNames.length > 1 ? 's' : ''}`, value: data.interviewerNames.join(', ') })
    : '';

  const tipsHtml = data.preparationTips && data.preparationTips.length > 0
    ? data.preparationTips.map(tip => `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 8px;">
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.6;">✓ ${tip}</td></tr>
        </table>
      `).join('')
    : '';

  const content = `
    ${Heading({ text: 'Interview Reminder', level: 1 })}
    ${Spacer(16)}
    ${Paragraph(`Hi <strong>${data.recipientName}</strong>,`, 'primary')}
    ${Spacer(8)}
    ${Paragraph('This is a reminder about your upcoming interview:', 'secondary')}
    ${Spacer(16)}
    ${Card({
      variant: 'highlight',
      content: `
        ${Heading({ text: data.interviewTitle, level: 3 })}
        ${Spacer(8)}
        ${InfoRow({ icon: '📅', label: 'Date', value: data.scheduledDate })}
        ${InfoRow({ icon: '🕐', label: 'Time', value: data.scheduledTime })}
        ${InfoRow({ icon: '🏢', label: 'Company', value: data.companyName })}
        ${interviewerInfo}
      `,
    })}
    ${tipsHtml ? `
      ${Spacer(24)}
      ${Card({
        variant: 'default',
        content: `
          ${Heading({ text: '🎯 Preparation Tips', level: 3 })}
          ${Spacer(8)}
          ${tipsHtml}
        `,
      })}
    ` : ''}
    ${data.meetingUrl ? `
      ${Spacer(24)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ url: data.meetingUrl, text: 'Join Interview', variant: 'primary' })}
          </td>
        </tr>
      </table>
    ` : ''}
    ${Spacer(24)}
    ${Paragraph('Good luck with your interview.', 'muted')}
  `;

  return baseEmailTemplate({
    preheader: `Reminder: ${data.interviewTitle} with ${data.companyName}`,
    content,
    showHeader: true,
    showFooter: true,
  });
}

/**
 * Generate plain text email for interview reminder
 */
export function generateInterviewReminderEmailText(data: InterviewReminderData): string {
  const tips = data.preparationTips?.map(t => `  - ${t}`).join('\n') || '';
  
  return `
Interview Reminder

Hi ${data.recipientName},

This is a reminder about your upcoming interview:

${data.interviewTitle}
Date: ${data.scheduledDate} at ${data.scheduledTime}
Company: ${data.companyName}
${data.interviewerNames?.length ? `Interviewer(s): ${data.interviewerNames.join(', ')}` : ''}

${data.preparationTips?.length ? `Preparation Tips:\n${tips}` : ''}

${data.meetingUrl ? `Join here: ${data.meetingUrl}` : ''}

Good luck with your interview!

---
This is an automated notification from The Quantum Club.
  `.trim();
}

/**
 * Generate a generic email with TQC branding
 */
export function generateGenericEmailHTML(data: GenericEmailData): string {
  const content = `
    ${Heading({ text: data.heading, level: 1 })}
    ${Spacer(16)}
    ${Paragraph(`Hi <strong>${data.recipientName}</strong>,`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(data.body, 'secondary')}
    ${data.ctaUrl && data.ctaLabel ? `
      ${Spacer(24)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ url: data.ctaUrl, text: data.ctaLabel, variant: 'primary' })}
          </td>
        </tr>
      </table>
    ` : ''}
  `;

  return baseEmailTemplate({
    preheader: data.preheader || data.heading,
    content,
    showHeader: true,
    showFooter: true,
  });
}

/**
 * Send email notification using Resend
 */
export async function sendMentionEmail(data: MentionEmailData): Promise<boolean> {
  try {
    console.log('[email] Sending mention notification to:', data.recipientEmail);

    const result = await sendEmailViaResend({
      from: EMAIL_SENDERS.notifications,
      to: data.recipientEmail,
      subject: `${data.mentionedBy} mentioned you in a note`,
      html: generateMentionEmailHTML(data),
      text: generateMentionEmailText(data),
    });

    console.log('[email] Email sent successfully:', result.id);
    return true;
  } catch (error) {
    console.error('[email] Error sending mention email:', error);
    return false;
  }
}

/**
 * Send interview reminder email using Resend
 */
export async function sendInterviewReminderEmail(data: InterviewReminderData): Promise<boolean> {
  try {
    console.log('[email] Sending interview reminder to:', data.recipientEmail);

    const result = await sendEmailViaResend({
      from: EMAIL_SENDERS.reminders,
      to: data.recipientEmail,
      subject: `Reminder: ${data.interviewTitle} with ${data.companyName}`,
      html: generateInterviewReminderEmailHTML(data),
      text: generateInterviewReminderEmailText(data),
    });

    console.log('[email] Interview reminder sent:', result.id);
    return true;
  } catch (error) {
    console.error('[email] Error sending interview reminder:', error);
    return false;
  }
}

/**
 * Send a generic email using Resend
 */
export async function sendGenericEmail(data: GenericEmailData): Promise<boolean> {
  try {
    console.log('[email] Sending generic email to:', data.recipientEmail);

    const result = await sendEmailViaResend({
      from: EMAIL_SENDERS.notifications,
      to: data.recipientEmail,
      subject: data.subject,
      html: generateGenericEmailHTML(data),
    });

    console.log('[email] Generic email sent:', result.id);
    return true;
  } catch (error) {
    console.error('[email] Error sending generic email:', error);
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// No-Show Warning (host notification for high-risk bookings)
// ────────────────────────────────────────────────────────────────────────────

export interface NoShowWarningData {
  hostName: string;
  hostEmail: string;
  guestName: string;
  guestEmail: string;
  meetingTitle: string;
  scheduledStart: string;
  riskScore: number;
  riskLevel: 'high' | 'critical';
}

export function generateNoShowWarningEmailHTML(data: NoShowWarningData): string {
  const appUrl = getEmailAppUrl();
  const scheduledDate = new Date(data.scheduledStart);
  const dateStr = scheduledDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const isCritical = data.riskLevel === 'critical';

  const content = `
    ${Heading({ text: `${isCritical ? '🚨' : '⚠️'} No-Show Risk Alert`, level: 1 })}
    ${Spacer(16)}
    ${Paragraph(`Hi <strong>${data.hostName || 'there'}</strong>,`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(`An upcoming booking has been flagged as <strong>${data.riskLevel} risk</strong> for a potential no-show.`, 'secondary')}
    ${Spacer(16)}
    ${Card({
      variant: 'warning',
      content: `
        ${Heading({ text: data.meetingTitle || 'Meeting', level: 3 })}
        ${Spacer(8)}
        ${InfoRow({ icon: '👤', label: 'Guest', value: data.guestName })}
        ${InfoRow({ icon: '📧', label: 'Email', value: data.guestEmail })}
        ${InfoRow({ icon: '📅', label: 'Date', value: dateStr })}
        ${InfoRow({ icon: '🕐', label: 'Time', value: timeStr })}
        ${InfoRow({ icon: '📊', label: 'Risk Score', value: `${data.riskScore}/100 (${data.riskLevel})` })}
      `,
    })}
    ${Spacer(16)}
    ${AlertBox({
      type: isCritical ? 'error' : 'warning',
      title: isCritical ? 'Critical Risk — Action Recommended' : 'High Risk — Be Prepared',
      message: isCritical
        ? 'This booking has a very high probability of no-show. Consider sending a personal confirmation message or having a backup plan ready.'
        : 'This booking has elevated no-show risk. A confirmation reminder has already been sent to the guest.',
    })}
    ${Spacer(16)}
    ${Paragraph('Automated interventions already taken:', 'muted')}
    ${Spacer(8)}
    ${Card({
      variant: 'default',
      content: `
        ${InfoRow({ icon: '✅', label: 'Extra Reminder', value: 'Sent to guest' })}
        ${isCritical ? InfoRow({ icon: '✅', label: 'Calendar Confirm', value: 'Requested from guest' }) : ''}
      `,
    })}
    ${Spacer(24)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          ${Button({ url: `${appUrl}/scheduling`, text: 'View Bookings', variant: 'primary' })}
        </td>
      </tr>
    </table>
    ${Spacer(16)}
    ${Paragraph('You can adjust no-show alert settings in Scheduling > AI Settings.', 'muted')}
  `;

  return baseEmailTemplate({
    preheader: `${isCritical ? '🚨' : '⚠️'} ${data.riskLevel} no-show risk for ${data.guestName}'s booking`,
    content,
    showHeader: true,
    showFooter: true,
  });
}

export function generateNoShowWarningEmailText(data: NoShowWarningData): string {
  const scheduledDate = new Date(data.scheduledStart);
  const dateStr = scheduledDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return `
No-Show Risk Alert

Hi ${data.hostName || 'there'},

An upcoming booking has been flagged as ${data.riskLevel} risk for a potential no-show.

Meeting: ${data.meetingTitle || 'Meeting'}
Guest: ${data.guestName} (${data.guestEmail})
Date: ${dateStr} at ${timeStr}
Risk Score: ${data.riskScore}/100 (${data.riskLevel})

${data.riskLevel === 'critical'
  ? 'This booking has a very high probability of no-show. Consider sending a personal confirmation message or having a backup plan ready.'
  : 'This booking has elevated no-show risk. A confirmation reminder has already been sent to the guest.'}

Automated interventions already taken:
- Extra reminder sent to guest
${data.riskLevel === 'critical' ? '- Calendar confirmation requested from guest' : ''}

---
This is an automated notification from The Quantum Club.
  `.trim();
}

export async function sendNoShowWarningEmail(data: NoShowWarningData): Promise<boolean> {
  try {
    console.log('[email] Sending no-show warning to host:', data.hostEmail);

    const result = await sendEmailViaResend({
      from: EMAIL_SENDERS.bookings,
      to: data.hostEmail,
      subject: `⚠️ ${data.riskLevel === 'critical' ? 'Critical' : 'High'} No-Show Risk: ${data.guestName}`,
      html: generateNoShowWarningEmailHTML(data),
      text: generateNoShowWarningEmailText(data),
    });

    console.log('[email] No-show warning sent:', result.id);
    return true;
  } catch (error) {
    console.error('[email] Error sending no-show warning:', error);
    return false;
  }
}

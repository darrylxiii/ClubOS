/**
 * Email notification templates for The Quantum Club
 * Uses Resend for actual email delivery
 */

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
 * Generate base HTML email template with TQC branding
 */
function generateBaseEmailHTML(content: string, footerText?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Quantum Club</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: #0E0E10;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }
    .header {
      background: linear-gradient(135deg, #C9A24E 0%, #B8924A 100%);
      padding: 24px 32px;
      text-align: center;
    }
    .header img {
      height: 40px;
      width: auto;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      color: #0E0E10;
      font-weight: 600;
    }
    .content {
      padding: 32px;
      color: #F5F4EF;
    }
    .content p {
      margin: 0 0 16px 0;
      color: #F5F4EF;
    }
    .highlight-box {
      background: rgba(201, 162, 78, 0.1);
      border-left: 4px solid #C9A24E;
      padding: 16px;
      margin: 16px 0;
      border-radius: 0 8px 8px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #C9A24E 0%, #B8924A 100%);
      color: #0E0E10;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 16px;
      text-align: center;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      padding: 24px 32px;
      border-top: 1px solid rgba(255,255,255,0.1);
      font-size: 12px;
      color: #888;
      text-align: center;
    }
    .footer a {
      color: #C9A24E;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      background: #C9A24E;
      color: #0E0E10;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .tip-list {
      list-style: none;
      padding: 0;
      margin: 16px 0;
    }
    .tip-list li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
      color: #F5F4EF;
    }
    .tip-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #C9A24E;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>The Quantum Club</h1>
    </div>
    ${content}
    <div class="footer">
      <p>${footerText || 'This is an automated notification from The Quantum Club.'}</p>
      <p>
        <a href="https://app.thequantumclub.com/settings?tab=notifications">Notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML email for note mention notification
 */
export function generateMentionEmailHTML(data: MentionEmailData): string {
  const content = `
    <div class="content">
      <p>Hi <strong>${data.recipientName}</strong>,</p>
      
      <p>
        <strong>${data.mentionedBy}</strong> mentioned you in a note about 
        <strong>${data.candidateName}</strong>.
      </p>
      
      <div class="highlight-box">
        <em>"${data.noteExcerpt}"</em>
      </div>
      
      <p>Click below to view the full note and respond:</p>
      
      <a href="${data.noteUrl}" class="button">
        View Note →
      </a>
    </div>
  `;

  return generateBaseEmailHTML(content);
}

/**
 * Generate plain text email for note mention notification
 */
export function generateMentionEmailText(data: MentionEmailData): string {
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
Update your notification preferences: ${data.appUrl || 'https://app.thequantumclub.com'}/settings?tab=notifications
  `.trim();
}

/**
 * Generate HTML email for interview reminder
 */
export function generateInterviewReminderEmailHTML(data: InterviewReminderData): string {
  const interviewerSection = data.interviewerNames && data.interviewerNames.length > 0
    ? `<p><strong>Interviewer${data.interviewerNames.length > 1 ? 's' : ''}:</strong> ${data.interviewerNames.join(', ')}</p>`
    : '';

  const tipsSection = data.preparationTips && data.preparationTips.length > 0
    ? `
      <p><strong>Preparation Tips:</strong></p>
      <ul class="tip-list">
        ${data.preparationTips.map(tip => `<li>${tip}</li>`).join('')}
      </ul>
    `
    : '';

  const content = `
    <div class="content">
      <p>Hi <strong>${data.recipientName}</strong>,</p>
      
      <p>This is a reminder about your upcoming interview:</p>
      
      <div class="highlight-box">
        <p><strong>${data.interviewTitle}</strong></p>
        <p>📅 ${data.scheduledDate} at ${data.scheduledTime}</p>
        <p>🏢 ${data.companyName}</p>
        ${interviewerSection}
      </div>
      
      ${tipsSection}
      
      ${data.meetingUrl ? `
        <a href="${data.meetingUrl}" class="button">
          Join Interview →
        </a>
      ` : ''}
    </div>
  `;

  return generateBaseEmailHTML(content, 'Good luck with your interview!');
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
    <div class="content">
      <p>Hi <strong>${data.recipientName}</strong>,</p>
      
      <h2 style="color: #C9A24E; margin: 24px 0 16px 0;">${data.heading}</h2>
      
      <div style="white-space: pre-wrap;">${data.body}</div>
      
      ${data.ctaUrl && data.ctaLabel ? `
        <a href="${data.ctaUrl}" class="button">
          ${data.ctaLabel} →
        </a>
      ` : ''}
    </div>
  `;

  return generateBaseEmailHTML(content, data.footerText);
}

/**
 * Send email notification using Resend
 */
export async function sendMentionEmail(data: MentionEmailData): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not configured. Email notification skipped.');
    return false;
  }
  
  try {
    console.log('[email] Sending mention notification to:', data.recipientEmail);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Quantum Club <notifications@thequantumclub.com>',
        to: data.recipientEmail,
        subject: `${data.mentionedBy} mentioned you in a note`,
        html: generateMentionEmailHTML(data),
        text: generateMentionEmailText(data),
      }),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[email] Resend API error:', response.status, errorBody);
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    
    const result = await response.json();
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
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not configured. Email notification skipped.');
    return false;
  }
  
  try {
    console.log('[email] Sending interview reminder to:', data.recipientEmail);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Quantum Club <notifications@thequantumclub.com>',
        to: data.recipientEmail,
        subject: `Reminder: ${data.interviewTitle} with ${data.companyName}`,
        html: generateInterviewReminderEmailHTML(data),
        text: generateInterviewReminderEmailText(data),
      }),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[email] Resend API error:', response.status, errorBody);
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    
    const result = await response.json();
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
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not configured. Email notification skipped.');
    return false;
  }
  
  try {
    console.log('[email] Sending generic email to:', data.recipientEmail);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Quantum Club <notifications@thequantumclub.com>',
        to: data.recipientEmail,
        subject: data.subject,
        html: generateGenericEmailHTML(data),
      }),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[email] Resend API error:', response.status, errorBody);
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('[email] Generic email sent:', result.id);
    return true;
  } catch (error) {
    console.error('[email] Error sending generic email:', error);
    return false;
  }
}

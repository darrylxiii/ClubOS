/**
 * Email notification templates for note mentions
 * This file prepares email templates for future implementation
 * 
 * When ready to enable email notifications:
 * 1. Add RESEND_API_KEY or SENDGRID_API_KEY to secrets
 * 2. Uncomment email sending code in send-note-mention-notification/index.ts
 * 3. Add user email preference check before sending
 */

interface MentionEmailData {
  recipientName: string;
  recipientEmail: string;
  mentionedBy: string;
  candidateName: string;
  noteExcerpt: string;
  noteUrl: string;
  appUrl?: string; // Optional app URL for links, defaults to production
}

/**
 * Generate HTML email for note mention notification
 */
export function generateMentionEmailHTML(data: MentionEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You were mentioned in a note</title>
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
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #C9A24E;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #0E0E10;
    }
    .content {
      margin-bottom: 24px;
    }
    .note-excerpt {
      background: #f8f8f8;
      border-left: 4px solid #C9A24E;
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
      font-style: italic;
      color: #555;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #C9A24E;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 16px;
    }
    .button:hover {
      background-color: #B8924A;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #888;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: #C9A24E;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💬 You were mentioned in a note</h1>
    </div>
    
    <div class="content">
      <p>Hi <strong>${data.recipientName}</strong>,</p>
      
      <p>
        <strong>${data.mentionedBy}</strong> mentioned you in a note about 
        <strong>${data.candidateName}</strong>.
      </p>
      
      <div class="note-excerpt">
        "${data.noteExcerpt}"
      </div>
      
      <p>Click below to view the full note and respond:</p>
      
      <a href="${data.noteUrl}" class="button">
        View Note →
      </a>
    </div>
    
    <div class="footer">
      <p>
        This is an automated notification from The Quantum Club.<br>
        <a href="${data.noteUrl}">View in browser</a> | 
        <a href="${data.appUrl || 'https://app.thequantumclub.com'}/settings?tab=notifications">Notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
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
 * Send email notification (placeholder for future implementation)
 * 
 * To enable:
 * 1. Add email service API key to secrets
 * 2. Implement actual email sending with Resend or SendGrid
 * 3. Add user preference checking
 */
export async function sendMentionEmail(data: MentionEmailData): Promise<boolean> {
  // TODO: Implement when ready
  // Example with Resend:
  /*
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Email notification skipped.');
    return false;
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'notifications@thequantumclub.com',
        to: data.recipientEmail,
        subject: `${data.mentionedBy} mentioned you in a note`,
        html: generateMentionEmailHTML(data),
        text: generateMentionEmailText(data),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending mention email:', error);
    return false;
  }
  */
  
  console.log('Email notification prepared (not sent - email service not configured):', {
    to: data.recipientEmail,
    subject: `${data.mentionedBy} mentioned you in a note`
  });
  
  return false;
}

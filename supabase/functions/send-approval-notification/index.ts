import { createHandler } from '../_shared/handler.ts';
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl, getEmailHeaders } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, AlertBox, StatusBadge, InfoRow,
} from "../_shared/email-templates/components.ts";
import { getAppUrl } from "../_shared/app-config.ts";
import { z, parseBody, emailSchema, nameSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const bodySchema = z.object({
  userId: z.string().optional(),
  email: emailSchema,
  fullName: nameSchema,
  requestType: z.enum(['candidate', 'partner']).optional().default('candidate'),
  status: z.enum(['approved', 'declined']),
  declineReason: z.string().max(2000).optional(),
  testMode: z.boolean().optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
    const parsed = await parseBody(req, bodySchema, ctx.corsHeaders);
    if ('error' in parsed) return parsed.error;
    const { userId, email, fullName, requestType, status, declineReason, testMode } = parsed.data;

    console.log('[send-approval-notification] Processing:', { userId, email, requestType, status, testMode });

    const appUrl = getAppUrl();
    let loginUrl = `${appUrl}/auth`;

    // For approved users, generate a magic link for direct login
    if (status === 'approved') {
      try {
        const { data: linkData, error: linkError } = await ctx.supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: { redirectTo: `${appUrl}/home` }
        });

        if (linkError) {
          console.error('[send-approval-notification] Magic link generation error:', linkError);
        } else if (linkData?.properties?.hashed_token) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          loginUrl = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(`${appUrl}/home`)}`;
          console.log('[send-approval-notification] Magic link generated successfully');
        }
      } catch (magicLinkError) {
        console.error('[send-approval-notification] Failed to generate magic link:', magicLinkError);
      }
    }

    // ── Partner-specific emails: delegate to dedicated functions ──
    if (requestType === 'partner') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      if (status === 'approved') {
        const welcomeResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-partner-welcome-email`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              fullName,
              magicLink: loginUrl !== `${appUrl}/auth` ? loginUrl : undefined,
              provisionMethod: 'magic_link',
            }),
          }
        );
        const welcomeResult = await welcomeResponse.json();
        return new Response(JSON.stringify({ success: welcomeResult.success }), {
          headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Partner decline
        const declineResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-partner-declined-email`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              contactName: fullName,
              declineReason,
            }),
          }
        );
        const declineResult = await declineResponse.json();
        return new Response(JSON.stringify({ success: declineResult.success }), {
          headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── Candidate emails (original flow) ──
    const subject = status === 'approved'
      ? 'Welcome to The Quantum Club'
      : 'Update on Your Application';

    let emailContent: string;

    if (status === 'approved') {
      const nextSteps = [
        'Your assigned strategist will contact you shortly',
        'Schedule your initial consultation call',
        'Get matched with exclusive opportunities',
        'Access our full suite of career tools',
      ];

      emailContent = `
        ${StatusBadge({ status: 'confirmed', text: 'APPROVED' })}
        ${Heading({ text: 'Welcome to The Quantum Club!', level: 1, align: 'center' })}
        ${Spacer(24)}
        ${Paragraph(`Dear ${sanitizeForEmail(fullName)},`, 'primary')}
        ${Spacer(8)}
        ${Paragraph(`Congratulations. Your application has been <strong style="color: ${EMAIL_COLORS.success};">approved</strong>. You are now a member of The Quantum Club's exclusive talent network.`, 'secondary')}
        ${Spacer(32)}
        ${Card({
          variant: 'highlight',
          content: `
            ${Heading({ text: 'What\'s Next', level: 3 })}
            ${Spacer(12)}
            ${nextSteps.map(step => Paragraph(`• ${step}`, 'secondary')).join(Spacer(4))}
          `,
        })}
        ${Spacer(32)}
        ${Button({ url: loginUrl, text: 'Access Your Dashboard', variant: 'primary' })}
        ${Spacer(16)}
        ${Paragraph('This link expires in 24 hours. After that, please use the regular login page.', 'muted')}
        ${Spacer(24)}
        ${Paragraph(`Questions? Contact us at <a href="mailto:onboarding@verify.thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">onboarding@verify.thequantumclub.nl</a>`, 'muted')}
        ${Spacer(24)}
        ${Paragraph('Welcome aboard,<br><strong>The Quantum Club Team</strong>', 'secondary')}
      `;
    } else {
      emailContent = `
        ${Heading({ text: 'Application Update', level: 1 })}
        ${Spacer(24)}
        ${Paragraph(`Dear ${sanitizeForEmail(fullName)},`, 'primary')}
        ${Spacer(8)}
        ${Paragraph('Thank you for your interest in joining The Quantum Club.', 'secondary')}
        ${Spacer(8)}
        ${Paragraph('After careful review, we have decided not to move forward with your application at this time.', 'secondary')}
        ${declineReason ? `
          ${Spacer(24)}
          ${Card({
            variant: 'default',
            content: `
              ${Heading({ text: 'Feedback', level: 3 })}
              ${Spacer(8)}
              ${Paragraph(sanitizeForEmail(declineReason), 'secondary')}
            `,
          })}
        ` : ''}
        ${Spacer(16)}
        ${Paragraph('We appreciate you taking the time to apply and wish you all the best in your career journey.', 'secondary')}
        ${Spacer(8)}
        ${Paragraph(`If you have any questions, feel free to reach out to us at <a href="mailto:onboarding@verify.thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">onboarding@verify.thequantumclub.nl</a>`, 'muted')}
        ${Spacer(24)}
        ${Paragraph('Best regards,<br><strong>The Quantum Club Team</strong>', 'secondary')}
      `;
    }

    const htmlContent = baseEmailTemplate({
      preheader: status === 'approved' ? 'Welcome to The Quantum Club! Your application has been approved.' : 'An update on your application to The Quantum Club.',
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    // Send email via shared Resend client
    const emailResponse = await sendEmail({
      from: EMAIL_SENDERS.notifications,
      to: [email],
      subject: subject,
      html: htmlContent,
      headers: getEmailHeaders(),
    });

    console.log('[send-approval-notification] Email sent successfully to:', email);

    // Log notification to database
    try {
      await ctx.supabase.from('approval_notification_logs').insert({
        user_id: userId,
        request_type: requestType,
        notification_type: 'email',
        status: 'sent',
        metadata: {
          email_id: emailResponse.id,
          email: email,
          subject: subject,
          approval_status: status,
        },
      });
    } catch (logError) {
      console.warn('[send-approval-notification] Failed to log notification:', logError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });
}));

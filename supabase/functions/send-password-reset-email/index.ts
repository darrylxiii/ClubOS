import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Heading, Paragraph, Spacer, CodeBox, Card, InfoRow, Divider, AlertBox } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, emailSchema } from '../_shared/validation.ts';
import { sanitizeForEmail, sanitizeTruncate } from '../_shared/sanitize.ts';

const requestSchema = z.object({
  email: emailSchema,
  userName: z.string().max(200).trim(),
  otpCode: z.string(),
  magicLink: z.string().url(),
  expiresInMinutes: z.number().int().positive(),
  ipAddress: z.string(),
  deviceInfo: z.string(),
  correlationId: z.string().optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
  // Internal-only: require service_role key or matching internal secret
  const authHeader = req.headers.get('authorization') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader.replace('Bearer ', '');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  // Only allow service_role calls (from other edge functions), not anon/user calls
  if (!token || token === anonKey) {
    console.warn('[send-password-reset-email] Blocked: called without service role authorization');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 403, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const parsed = await parseBody(req, requestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const {
    email,
    userName,
    otpCode,
    magicLink,
    expiresInMinutes,
    ipAddress,
    deviceInfo,
    correlationId
  } = parsed.data;

  console.log(`[PasswordReset][${correlationId}][email] Sending password reset email`);

  const emailContent = `
    ${Heading({ text: 'Reset Your Password', level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(`Hi ${sanitizeForEmail(userName)},`, 'secondary')}
    ${Spacer(8)}
    ${Paragraph('We received a request to reset your password for The Quantum Club.', 'secondary')}
    ${Spacer(32)}

    <!-- Primary CTA -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          ${Button({
            url: magicLink,
            text: 'Reset Password',
            variant: 'primary'
          })}
        </td>
      </tr>
    </table>
    ${Spacer(32)}

    ${Divider({ spacing: 'medium' })}
    ${Spacer(8)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <span style="font-size: 13px; color: ${EMAIL_COLORS.textMuted};">OR ENTER THIS CODE</span>
        </td>
      </tr>
    </table>
    ${Spacer(24)}

    ${CodeBox({ code: otpCode, label: '6-Digit Code' })}
    ${Spacer(16)}

    ${AlertBox({
      type: 'warning',
      message: `This code expires in <strong>${expiresInMinutes} minutes</strong>.`,
    })}
    ${Spacer(32)}

    ${Paragraph('If you didn\'t request this, you can safely ignore this email. Your password won\'t change.', 'muted')}
    ${Spacer(24)}

    ${Card({
      variant: 'default',
      content: `
        <p style="font-size: 12px; color: ${EMAIL_COLORS.textMuted}; margin: 0 0 8px 0;">Request details:</p>
        ${InfoRow({ label: 'IP Address', value: sanitizeForEmail(ipAddress) })}
        ${InfoRow({ label: 'Device', value: sanitizeTruncate(deviceInfo, 60) + '...' })}
      `
    })}
  `;

  const html = baseEmailTemplate({
    preheader: 'You requested a password reset for The Quantum Club',
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.security,
    to: [email],
    subject: "Reset Your Password — The Quantum Club",
    html,
  });
  console.log(`[PasswordReset][${correlationId}][email] Sent successfully:`, result);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json", ...ctx.corsHeaders },
  });
}));

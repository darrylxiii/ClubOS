import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Heading, Paragraph, Spacer, AlertBox, Divider } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { getAppUrl } from '../_shared/app-config.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { z, parseBody, emailSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const requestSchema = z.object({
  email: emailSchema,
  redirectTo: z.string().url().optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, requestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { email, redirectTo } = parsed.data;

  const normalizedEmail = email;

  // Rate limit: 5 magic link requests per hour per email
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';

  const rateLimitResult = await checkUserRateLimit(
    `${normalizedEmail}:${ipAddress}`,
    'send-magic-link-email',
    5,
    3600000 // 1 hour
  );

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult.retryAfter!, ctx.corsHeaders);
  }

  const appUrl = getAppUrl();
  const redirect = redirectTo || `${appUrl}/home`;

  // Generate magic link via Supabase Admin API (does NOT send email)
  const { data: linkData, error: linkError } = await ctx.supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: { redirectTo: redirect },
  });

  if (linkError) {
    console.error('[send-magic-link-email] generateLink error:', linkError);
    // Return generic success to prevent email enumeration
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Build the magic link URL using the hashed token
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const magicLink = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(redirect)}`;

  // Look up the user's name for personalization
  let userName = '';
  try {
    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('full_name')
      .eq('email', normalizedEmail)
      .maybeSingle();
    userName = profile?.full_name || '';
  } catch {
    // Non-critical — continue without name
  }

  const greeting = userName ? `Hi ${userName},` : 'Hi there,';

  // Build branded email
  const emailContent = `
    ${Heading({ text: 'Sign In to The Quantum Club', level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(greeting, 'secondary')}
    ${Spacer(8)}
    ${Paragraph('We received a request to sign you in. Click the button below to access your account instantly.', 'secondary')}
    ${Spacer(32)}

    <!-- Primary CTA -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          ${Button({
            url: magicLink,
            text: 'Sign In to My Account',
            variant: 'primary'
          })}
        </td>
      </tr>
    </table>
    ${Spacer(32)}

    ${AlertBox({
      type: 'warning',
      message: 'This link expires in <strong>1 hour</strong> and can only be used once.',
    })}
    ${Spacer(24)}

    ${Divider({ spacing: 'medium' })}
    ${Spacer(8)}
    ${Paragraph('If you didn\'t request this sign-in link, you can safely ignore this email. Your account remains secure.', 'muted')}
    ${Spacer(16)}
    ${Paragraph('For security, this link was requested from IP: <strong>' + sanitizeForEmail(ipAddress) + '</strong>', 'muted')}
  `;

  const html = baseEmailTemplate({
    preheader: 'Your secure sign-in link for The Quantum Club',
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.login,
    to: [normalizedEmail],
    subject: "Your Sign-In Link — The Quantum Club",
    html,
  });

  console.log('[send-magic-link-email] Sent successfully to:', normalizedEmail);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));

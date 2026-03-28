import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailHeaders } from "../_shared/email-config.ts";
import { getAppUrl } from "../_shared/app-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, Button, InfoRow } from "../_shared/email-templates/components.ts";
import { z, parseBody, emailSchema, uuidSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const requestSchema = z.object({
  email: emailSchema,
  inviteCode: z.string().min(1).max(500),
  companyId: uuidSchema.optional(),
  companyName: z.string().min(1).max(300).trim(),
  inviterName: z.string().max(200).trim().optional(),
  role: z.string().min(1).max(100),
  recipientName: z.string().max(200).trim().optional(),
  customMessage: z.string().max(2000).trim().optional(),
});

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const parsed = await parseBody(req, requestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  // companyId is optional for partner invites (partners are external)
  const isPartnerRole = body.role === 'partner';
  if (!body.companyId && !isPartnerRole) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // SERVER-SIDE DOMAIN VALIDATION — skip for partner invites (external by definition)
  const inviteeDomain = body.email.split('@')[1]?.toLowerCase();
  if (!inviteeDomain) {
    return new Response(JSON.stringify({ error: 'Invalid email format' }), {
      status: 400,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const isPartnerInvite = body.role === 'partner';

  if (!isPartnerInvite) {
    const { data: domainSettings, error: domainError } = await ctx.supabase
      .from('organization_domain_settings')
      .select('domain')
      .eq('company_id', body.companyId)
      .eq('is_enabled', true);

    if (domainError) {
      console.error('Error fetching domain settings:', domainError);
    }

    const allowedDomains = domainSettings?.map(d => d.domain.toLowerCase()) || [];

    if (allowedDomains.length > 0 && !allowedDomains.includes(inviteeDomain)) {
      const allowedList = allowedDomains.map(d => `@${d}`).join(', ');
      return new Response(JSON.stringify({
        error: `Only emails from ${allowedList} are allowed for this company`
      }), {
        status: 403,
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  const appUrl = getAppUrl();
  const signupUrl = `${appUrl}/auth?invite=${body.inviteCode}`;

  // Sanitize user-supplied text before embedding in HTML
  const safeRecipientName = sanitizeForEmail(body.recipientName);
  const safeInviterName = sanitizeForEmail(body.inviterName);
  const safeCompanyName = sanitizeForEmail(body.companyName);
  const safeCustomMessage = sanitizeForEmail(body.customMessage);
  const safeRole = sanitizeForEmail(body.role);

  // Personalized greeting
  const greeting = safeRecipientName
    ? `Hi ${safeRecipientName},`
    : '';

  const inviterLine = safeInviterName
    ? `<strong>${safeInviterName}</strong> has invited you`
    : 'You have been invited';

  // Custom message block
  const customMessageBlock = safeCustomMessage
    ? `${Spacer(16)}${Card({
        variant: 'highlight',
        content: `<p style="margin: 0; font-style: italic; color: ${EMAIL_COLORS.textSecondary};">"${safeCustomMessage}"</p><p style="margin: 8px 0 0; font-size: 13px; color: ${EMAIL_COLORS.textMuted};">— ${safeInviterName || 'Your inviter'}</p>`,
      })}`
    : '';

  // Partner-specific vs standard content
  const isPartner = body.role === 'partner';
  const headingText = isPartner ? 'Partner Invitation' : "You're Invited";
  const subjectLine = isPartner
    ? `${safeInviterName || 'The Quantum Club'} has invited you to partner with The Quantum Club`
    : `You're invited to join ${safeCompanyName} on The Quantum Club`;

  const partnerValueProp = isPartner
    ? `${Spacer(16)}${Paragraph("As a partner, you will get access to curated shortlists, candidate dossiers, and a dedicated strategist to streamline your hiring process.", 'muted')}`
    : '';

  const emailContent = `
    ${greeting ? `${Paragraph(greeting, 'secondary')}${Spacer(8)}` : ''}
    ${Heading({ text: headingText, level: 1 })}
    ${Spacer(16)}
    ${Paragraph(`${inviterLine} to join <strong>${safeCompanyName}</strong> on The Quantum Club as a <strong style="color: ${EMAIL_COLORS.gold};">${safeRole}</strong>.`, 'secondary')}
    ${partnerValueProp}
    ${customMessageBlock}
    ${Spacer(24)}
    ${Card({
      variant: 'highlight',
      content: `
        ${InfoRow({ icon: '🏢', label: 'Company', value: safeCompanyName })}
        ${InfoRow({ icon: '👤', label: 'Role', value: safeRole })}
      `,
    })}
    ${Spacer(32)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          ${Button({ url: signupUrl, text: isPartner ? 'Accept Partner Invitation' : 'Accept Invitation', variant: 'primary' })}
        </td>
      </tr>
    </table>
    ${Spacer(16)}
    ${Paragraph('This invitation expires in 7 days. If you didn\'t expect this invitation, you can safely ignore this email.', 'muted')}
  `;

  const htmlContent = baseEmailTemplate({
    preheader: `${safeInviterName || 'Someone'} invited you to join ${safeCompanyName} on The Quantum Club`,
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  // Use partner sender for partner invites
  const sender = isPartner ? (EMAIL_SENDERS as Record<string, string>).partners || EMAIL_SENDERS.system : EMAIL_SENDERS.system;

  await sendEmail({
    from: sender,
    to: body.email,
    subject: subjectLine,
    html: htmlContent,
    headers: getEmailHeaders(),
  });

  // Log the sent invite
  await ctx.supabase
    .from('comprehensive_audit_logs')
    .insert({
      actor_id: ctx.user.id,
      actor_role: 'user',
      event_type: 'team_invite_sent',
      action: 'send',
      event_category: 'communication',
      resource_type: 'invite',
      description: `Team invite sent to ${body.email} for ${body.companyName}`,
      after_value: {
        email: body.email,
        company_id: body.companyId || null,
        company_name: body.companyName,
        role: body.role,
        invite_code: body.inviteCode,
        recipient_name: body.recipientName || null,
        is_partner_invite: isPartner,
      },
      actor_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      actor_user_agent: req.headers.get('user-agent') || 'unknown'
    });

  return new Response(JSON.stringify({
    success: true,
    message: `Invitation sent to ${body.email}`
  }), {
    status: 200,
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
  });
}));

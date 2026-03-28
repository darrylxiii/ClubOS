import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from '../_shared/email-templates/base-template.ts';
import { Button, Heading, Paragraph, Spacer, Card, AlertBox } from '../_shared/email-templates/components.ts';
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailHeaders } from '../_shared/email-config.ts';
import { sendEmail } from '../_shared/resend-client.ts';
import { getAppUrl } from '../_shared/app-config.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { z, parseBody, uuidSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const bodySchema = z.object({
  candidateId: uuidSchema,
  customMessage: z.string().max(500).optional(),
});

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  // Rate limit: 10 invitations per hour per user
  const rateLimit = await checkUserRateLimit(ctx.user.id, 'send-candidate-invitation', 10);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.retryAfter ?? 60, ctx.corsHeaders);
  }

  const parsed = await parseBody(req, bodySchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { candidateId, customMessage } = parsed.data;

  // Fetch candidate profile
  const { data: candidate, error: cpError } = await ctx.supabase
    .from('candidate_profiles')
    .select('id, email, full_name, user_id')
    .eq('id', candidateId)
    .single();

  if (cpError || !candidate) {
    return new Response(JSON.stringify({ error: 'Candidate not found' }), {
      status: 404,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!candidate.email) {
    return new Response(JSON.stringify({ error: 'Candidate has no email address' }), {
      status: 400,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // If candidate already has an account, no invitation needed
  if (candidate.user_id) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Candidate already has an account',
      alreadyLinked: true,
    }), {
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate invite code
  const { data: inviteCode, error: inviteError } = await ctx.supabase
    .from('invite_codes')
    .insert({
      code: crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase(),
      email: candidate.email,
      role: 'candidate',
      created_by: ctx.user.id,
      created_by_type: 'admin',
      is_used: false,
      metadata: {
        candidate_profile_id: candidateId,
        candidate_name: candidate.full_name,
        custom_message: customMessage || null,
      },
    })
    .select('code')
    .single();

  if (inviteError) {
    console.error('[send-candidate-invitation] Failed to create invite code:', inviteError);
    return new Response(JSON.stringify({ error: 'Failed to create invitation' }), {
      status: 500,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Build email using template system
  const appUrl = getAppUrl();
  const firstName = candidate.full_name?.split(' ')[0] || 'there';
  const signupUrl = `${appUrl}/auth?invite=${inviteCode.code}`;

  const emailContent = `
    ${Heading({ text: "You've Been Invited", level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(`Hi ${firstName},`, 'secondary')}
    ${Paragraph("You've been invited to join The Quantum Club \u2014 an exclusive talent platform connecting exceptional professionals with remarkable opportunities.", 'secondary')}
    ${Spacer(16)}
    ${customMessage ? `
      ${Card({ variant: 'highlight', content: Paragraph(sanitizeForEmail(customMessage), 'secondary') })}
      ${Spacer(16)}
    ` : ''}
    ${Button({ url: signupUrl, text: 'Accept Invitation', variant: 'primary' })}
    ${Spacer(24)}
    ${AlertBox({ type: 'info', title: 'Personal Invitation', message: 'This invitation is personal and tied to your email address. Please do not share it with others.' })}
    ${Spacer(24)}
    ${Paragraph("If you didn't expect this invitation, you can safely ignore this email. No action will be taken on your behalf.", 'muted')}
  `;

  const html = baseEmailTemplate({
    preheader: `${firstName}, you've been invited to The Quantum Club`,
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  try {
    await sendEmail({
      from: EMAIL_SENDERS.notifications,
      to: [candidate.email],
      subject: `${firstName}, you've been invited to The Quantum Club`,
      html,
      headers: getEmailHeaders(),
    });
  } catch (emailError) {
    console.error('[send-candidate-invitation] Resend error:', emailError);
    return new Response(JSON.stringify({
      error: 'Failed to send invitation email',
      inviteCode: inviteCode.code,
    }), {
      status: 500,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log the invitation
  try {
    await ctx.supabase.from('candidate_interactions').insert({
      candidate_id: candidateId,
      interaction_type: 'invitation_sent',
      interaction_direction: 'outbound',
      title: 'Platform Invitation Sent',
      content: `Invitation email sent to ${candidate.email}`,
      created_by: ctx.user.id,
      is_internal: true,
      visible_to_candidate: false,
    });
  } catch (logErr) {
    console.error('[send-candidate-invitation] Failed to log interaction:', logErr);
  }

  return new Response(JSON.stringify({
    success: true,
    inviteCode: inviteCode.code,
    message: `Invitation sent to ${candidate.email}`,
  }), {
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
  });
}));

import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { sendEmail } from '../_shared/resend-client.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const { candidateId, customMessage } = await req.json();

  if (!candidateId) {
    return new Response(JSON.stringify({ error: 'candidateId is required' }), {
      status: 400,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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

  // Send email via Resend
  const appUrl = Deno.env.get('APP_URL') || 'https://os.thequantumclub.com';
  const firstName = candidate.full_name?.split(' ')[0] || 'there';

  const signupUrl = `${appUrl}/auth?invite=${inviteCode.code}`;

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #0E0E10; color: #F5F4EF; padding: 40px 32px; border-radius: 16px;">
      <img src="${appUrl}/quantum-logo.svg" alt="The Quantum Club" style="height: 32px; margin-bottom: 32px;" />

      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px;">You've been invited</h1>

      <p style="font-size: 15px; line-height: 1.6; color: #A0A0A5; margin: 0 0 16px;">
        Hi ${firstName}, you've been invited to join The Quantum Club — an exclusive talent platform connecting exceptional professionals with remarkable opportunities.
      </p>

      ${customMessage ? `<p style="font-size: 15px; line-height: 1.6; color: #A0A0A5; margin: 0 0 24px; padding: 16px; border-left: 3px solid #C9A24E; background: rgba(201,162,78,0.05);">${customMessage}</p>` : ''}

      <a href="${signupUrl}" style="display: inline-block; background: #C9A24E; color: #0E0E10; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; margin: 8px 0 24px;">
        Accept Invitation
      </a>

      <p style="font-size: 13px; color: #666; margin: 24px 0 0;">
        This invitation was sent by The Quantum Club. If you didn't expect this, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      from: 'The Quantum Club <talent@thequantumclub.nl>',
      to: [candidate.email],
      subject: `${firstName}, you've been invited to The Quantum Club`,
      html: emailHtml,
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

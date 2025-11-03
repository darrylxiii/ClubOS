import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Card, Heading, Paragraph, Spacer } from "../_shared/email-templates/components.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId, message, jobContext } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) throw new Error('Unauthorized');

    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error('Candidate not found');
    }

    const { data: existingInvite } = await supabase
      .from('candidate_invitations')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      throw new Error('Candidate already has a pending invitation');
    }

    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { error: inviteError } = await supabase
      .from('candidate_invitations')
      .insert({
        candidate_id: candidateId,
        invited_by: user.id,
        invitation_token: inviteToken,
        email: candidate.email,
        expires_at: expiresAt.toISOString(),
        message_template: message,
        job_context: jobContext || []
      });

    if (inviteError) throw inviteError;

    await supabase
      .from('candidate_profiles')
      .update({
        invitation_status: 'invited',
        last_invite_sent_at: new Date().toISOString()
      })
      .eq('id', candidateId);

    const inviteUrl = `${Deno.env.get('VITE_APP_URL') || 'https://app.thequantumclub.com'}/invite/${inviteToken}`;
    
    const jobList = jobContext && jobContext.length > 0
      ? jobContext.map((j: any) => `<li class="text-secondary" style="margin-bottom: 8px;">• ${j.job_title}</li>`).join('')
      : '';

    const emailContent = `
      ${Heading({ text: 'Welcome to The Quantum Club', level: 1 })}
      ${Spacer(24)}
      ${Paragraph(`Hi ${candidate.full_name},`, 'primary')}
      ${Spacer(16)}
      ${Paragraph(message.replace(/\n/g, '<br>'), 'secondary')}
      ${Spacer(32)}
      ${jobList ? Card({
        variant: 'default',
        content: `
          ${Paragraph('<strong>Relevant Opportunities:</strong>', 'primary')}
          ${Spacer(16)}
          <ul style="margin: 0; padding-left: 20px;">
            ${jobList}
          </ul>
        `
      }) : ''}
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ url: inviteUrl, text: 'Accept Invitation', variant: 'primary' })}
          </td>
        </tr>
      </table>
      ${Spacer(32)}
      ${Card({
        variant: 'default',
        content: `
          ${Paragraph('⏱️ <strong>This invitation expires in 7 days</strong>', 'secondary')}
          ${Spacer(16)}
          ${Paragraph('If you have any questions, feel free to reply to this email. We\'re here to help!', 'muted')}
        `
      })}
    `;

    const emailHtml = baseEmailTemplate({
      preheader: 'You are invited to join The Quantum Club',
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'The Quantum Club <team@thequantumclub.com>',
        to: candidate.email,
        subject: 'You are invited to join The Quantum Club',
        html: emailHtml
      })
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    await supabase.from('candidate_interactions').insert({
      candidate_id: candidateId,
      interaction_type: 'email',
      interaction_direction: 'outbound',
      title: 'Platform invitation sent',
      content: `Invitation email sent to ${candidate.email}`,
      created_by: user.id,
      visible_to_candidate: false
    });

    return new Response(
      JSON.stringify({ success: true, token: inviteToken, expiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending invitation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

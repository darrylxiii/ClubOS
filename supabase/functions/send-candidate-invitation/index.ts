import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    const jobMentions = jobContext && jobContext.length > 0
      ? `<p><strong>Relevant Opportunities:</strong></p><ul>${jobContext.map((j: any) => `<li>${j.job_title}</li>`).join('')}</ul>`
      : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0E0E10 0%, #1a1a1c 100%); color: #F5F4EF; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 40px 30px; border: 1px solid #e5e5e5; border-top: none; }
            .button { display: inline-block; padding: 14px 32px; background: #C9A24E; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Welcome to The Quantum Club</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Exclusive Talent Platform</p>
            </div>
            <div class="content">
              <p>Hi ${candidate.full_name},</p>
              
              <p>${message.split('\n').join('<br>')}</p>
              
              ${jobMentions}
              
              <p style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </p>
              
              <p style="font-size: 14px; color: #666;">
                This invitation expires in 7 days. If you have any questions, feel free to reply to this email.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} The Quantum Club. All rights reserved.</p>
              <p>You received this email because someone at The Quantum Club invited you to join our platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

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

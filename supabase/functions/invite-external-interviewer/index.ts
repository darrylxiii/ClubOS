/**
 * Invite External Interviewer
 * Sends magic link invitation to non-platform users for interview panel participation
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_SENDERS, EMAIL_COLORS, EMAIL_LOGOS, getEmailAppUrl } from "../_shared/email-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { 
      jobId, 
      email, 
      fullName, 
      jobTitle,
      companyId,
      jobRole = 'external_interviewer',
      permissions = { can_view_candidates: true },
      expiresInDays = 7
    } = await req.json();

    if (!jobId || !email || !companyId) {
      return new Response(JSON.stringify({ error: 'Job ID, email, and company ID are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if interviewer already exists for this company
    let { data: existingInterviewer } = await supabase
      .from('external_interviewers')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    let interviewerId: string;

    if (existingInterviewer) {
      interviewerId = existingInterviewer.id;
      // Update last invited timestamp
      await supabase
        .from('external_interviewers')
        .update({ 
          last_active_at: new Date().toISOString(),
          full_name: fullName || undefined,
          job_title: jobTitle || undefined
        })
        .eq('id', interviewerId);
    } else {
      // Create new external interviewer record
      const { data: newInterviewer, error: createError } = await supabase
        .from('external_interviewers')
        .insert({
          company_id: companyId,
          email: email.toLowerCase(),
          full_name: fullName,
          job_title: jobTitle,
          invited_by: user.id,
          expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;
      interviewerId = newInterviewer.id;
    }

    // Check if already assigned to this job
    const { data: existingAssignment } = await supabase
      .from('job_team_assignments')
      .select('id')
      .eq('job_id', jobId)
      .eq('external_user_id', interviewerId)
      .maybeSingle();

    if (existingAssignment) {
      return new Response(JSON.stringify({ 
        error: 'This interviewer is already assigned to this job',
        interviewerId 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create job team assignment
    const { error: assignmentError } = await supabase
      .from('job_team_assignments')
      .insert({
        job_id: jobId,
        external_user_id: interviewerId,
        assignment_type: 'external_interviewer',
        job_role: jobRole,
        assigned_by: user.id,
        ...permissions
      });

    if (assignmentError) throw assignmentError;

    // Generate magic link token
    const magicToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    // Store magic link token
    const { error: tokenError } = await supabase
      .from('external_interviewer_tokens')
      .insert({
        interviewer_id: interviewerId,
        token: magicToken,
        job_id: jobId,
        expires_at: expiresAt.toISOString(),
        created_by: user.id
      });

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      // Continue anyway - might be table doesn't exist yet
    }

    // Get job and company details for email
    const { data: job } = await supabase
      .from('jobs')
      .select('title, company_id')
      .eq('id', jobId)
      .single();

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Build magic link URL
    const appUrl = getEmailAppUrl();
    const magicLinkUrl = `${appUrl}/external-interview?token=${magicToken}&job=${jobId}`;

    // Send invitation email
    if (resendApiKey) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${EMAIL_COLORS.eclipse};">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="text-align: center; padding-bottom: 32px;">
        <img src="${EMAIL_LOGOS.cloverIcon}" alt="The Quantum Club" width="60" height="60" />
      </td>
    </tr>
    <tr>
      <td style="background: ${EMAIL_COLORS.cardBg}; border-radius: 12px; padding: 32px;">
        <h1 style="color: ${EMAIL_COLORS.ivory}; font-size: 24px; margin: 0 0 16px;">
          You're Invited to Interview
        </h1>
        <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          ${inviterProfile?.full_name || 'A team member'} from <strong style="color: ${EMAIL_COLORS.ivory};">${company?.name || 'the hiring team'}</strong> 
          has invited you to participate in the interview process for:
        </p>
        
        <div style="background: ${EMAIL_COLORS.eclipse}; border-radius: 8px; padding: 20px; margin: 0 0 24px; border-left: 4px solid ${EMAIL_COLORS.gold};">
          <h2 style="color: ${EMAIL_COLORS.ivory}; font-size: 18px; margin: 0;">
            ${job?.title || 'Open Position'}
          </h2>
          <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; margin: 8px 0 0;">
            at ${company?.name}
          </p>
        </div>
        
        <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Click the button below to access candidate profiles, review materials, and submit your interview feedback.
          This link expires in <strong style="color: ${EMAIL_COLORS.ivory};">${expiresInDays} days</strong>.
        </p>
        
        <a href="${magicLinkUrl}" 
           style="display: inline-block; background: ${EMAIL_COLORS.gold}; color: ${EMAIL_COLORS.eclipse}; 
                  padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Access Interview Portal
        </a>
        
        <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 12px; margin: 24px 0 0;">
          If the button doesn't work, copy this link:<br>
          <a href="${magicLinkUrl}" style="color: ${EMAIL_COLORS.gold}; word-break: break-all;">${magicLinkUrl}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="text-align: center; padding-top: 24px;">
        <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 12px; margin: 0;">
          This is a secure, time-limited invitation from The Quantum Club.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: EMAIL_SENDERS.notifications,
          to: email,
          subject: `You're invited to interview candidates for ${job?.title || 'a position'} at ${company?.name || 'a company'}`,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Email send failed:', await emailResponse.text());
      }
    }

    // Log the invite action
    await supabase.from('admin_audit_activity').insert({
      admin_id: user.id,
      action_type: 'invite_external_interviewer',
      action_category: 'job_team',
      target_entity: 'external_interviewers',
      target_id: interviewerId,
      metadata: { 
        job_id: jobId, 
        email, 
        expires_in_days: expiresInDays 
      }
    });

    return new Response(JSON.stringify({
      success: true,
      interviewerId,
      magicLinkUrl,
      expiresAt: expiresAt.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Invite external interviewer error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to invite external interviewer',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

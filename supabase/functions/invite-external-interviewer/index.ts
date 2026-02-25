/**
 * Invite External Interviewer
 * Sends magic link invitation to non-platform users for interview panel participation
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, Button, InfoRow } from "../_shared/email-templates/components.ts";

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
      await supabase
        .from('external_interviewers')
        .update({ 
          last_active_at: new Date().toISOString(),
          full_name: fullName || undefined,
          job_title: jobTitle || undefined
        })
        .eq('id', interviewerId);
    } else {
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

    const appUrl = getEmailAppUrl();
    const magicLinkUrl = `${appUrl}/external-interview?token=${magicToken}&job=${jobId}`;

    // Send invitation email using base template
    if (resendApiKey) {
      const positionTitle = job?.title || 'Open Position';
      const companyName = company?.name || 'the hiring team';
      const inviterName = inviterProfile?.full_name || 'A team member';

      const emailContent = `
        ${Heading({ text: "You're Invited to Interview", level: 1 })}
        ${Spacer(16)}
        ${Paragraph(`${inviterName} from <strong>${companyName}</strong> has invited you to participate in the interview process.`, 'secondary')}
        ${Spacer(16)}
        ${Card({
          variant: 'highlight',
          content: `
            ${Heading({ text: positionTitle, level: 3 })}
            ${Spacer(8)}
            ${InfoRow({ icon: '🏢', label: 'Company', value: companyName })}
            ${InfoRow({ icon: '⏳', label: 'Expires', value: `${expiresInDays} days` })}
          `,
        })}
        ${Spacer(16)}
        ${Paragraph('Click the button below to access candidate profiles, review materials, and submit your interview feedback.', 'secondary')}
        ${Spacer(24)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center">
              ${Button({ url: magicLinkUrl, text: 'Access Interview Portal', variant: 'primary' })}
            </td>
          </tr>
        </table>
        ${Spacer(16)}
        ${Paragraph(`If the button doesn\'t work, copy this link: <a href="${magicLinkUrl}" style="color: ${EMAIL_COLORS.gold}; word-break: break-all;">${magicLinkUrl}</a>`, 'muted')}
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
          subject: `You're invited to interview candidates for ${positionTitle} at ${companyName}`,
          html: baseEmailTemplate({
            preheader: `${inviterName} invited you to interview for ${positionTitle} at ${companyName}`,
            content: emailContent,
            showHeader: true,
            showFooter: true,
          }),
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

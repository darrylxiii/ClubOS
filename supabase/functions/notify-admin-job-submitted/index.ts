/**
 * Notify Admin: Job Submitted for Review
 * Sends branded email to all admins and creates in-app notifications
 * when a partner submits a new role for approval.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, StatusBadge, InfoRow, Button,
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl, getEmailHeaders, htmlToPlainText } from "../_shared/email-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface JobSubmittedRequest {
  jobId: string;
  jobTitle: string;
  companyName: string;
  submittedByName: string;
  submittedByEmail: string;
  employmentType: string;
  location: string;
  department?: string;
  seniorityLevel?: string;
  urgency?: string;
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  fulltime: 'Full-time',
  parttime: 'Part-time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
};

const URGENCY_LABELS: Record<string, string> = {
  immediate: 'Immediate',
  two_weeks: 'Within 2 weeks',
  one_month: 'Within 1 month',
  three_months: 'Within 3 months',
  no_rush: 'No rush',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('[notify-admin-job-submitted] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: JobSubmittedRequest = await req.json();
    const {
      jobId, jobTitle, companyName, submittedByName, submittedByEmail,
      employmentType, location, department, seniorityLevel, urgency,
    } = body;

    if (!jobId || !jobTitle || !companyName) {
      return new Response(
        JSON.stringify({ error: 'jobId, jobTitle, and companyName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[notify-admin-job-submitted] New role: ${jobTitle} at ${companyName}`);

    // Fetch admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError || !adminRoles?.length) {
      console.warn('[notify-admin-job-submitted] No admin users found:', rolesError);
      return new Response(
        JSON.stringify({ success: false, error: 'No admin users found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminUserIds = adminRoles.map(r => r.user_id);

    // Fetch admin profiles for emails
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', adminUserIds);

    const adminEmails = (adminProfiles || [])
      .map(p => p.email)
      .filter(Boolean) as string[];

    const appUrl = getEmailAppUrl();

    // Build email content
    const emailContent = `
      ${StatusBadge({ status: 'pending', text: 'NEW ROLE SUBMITTED' })}
      ${Heading({ text: 'A new role needs your review', level: 1, align: 'center' })}
      ${Spacer(24)}
      ${Paragraph(`<strong>${submittedByName}</strong> (${submittedByEmail}) has submitted a new role for <strong>${companyName}</strong>.`, 'primary')}
      ${Spacer(16)}
      ${Card({
        variant: 'highlight',
        content: `
          ${Heading({ text: jobTitle, level: 3 })}
          ${Spacer(12)}
          ${InfoRow({ icon: '🏢', label: 'Company', value: companyName })}
          ${InfoRow({ icon: '📍', label: 'Location', value: location || 'Not specified' })}
          ${InfoRow({ icon: '💼', label: 'Type', value: EMPLOYMENT_LABELS[employmentType] || employmentType })}
          ${department ? InfoRow({ icon: '🏷️', label: 'Department', value: department }) : ''}
          ${seniorityLevel ? InfoRow({ icon: '📊', label: 'Seniority', value: seniorityLevel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }) : ''}
          ${urgency ? InfoRow({ icon: '⏱️', label: 'Urgency', value: URGENCY_LABELS[urgency] || urgency }) : ''}
        `,
      })}
      ${Spacer(24)}
      ${Button({ text: 'Review Role', url: `${appUrl}/admin/job-approvals`, variant: 'primary' })}
      ${Spacer(16)}
      ${Paragraph('This role will remain in "Pending Approval" until an admin reviews and publishes it.', 'muted')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: `New role submitted: ${jobTitle} at ${companyName}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    // Send email to all admins
    if (adminEmails.length > 0) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: EMAIL_SENDERS.partners,
          to: adminEmails,
          subject: `New role submitted for review: ${jobTitle}`,
          html: htmlContent,
          text: htmlToPlainText(htmlContent),
          headers: getEmailHeaders(),
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('[notify-admin-job-submitted] Resend error:', errorText);
      } else {
        const result = await emailResponse.json();
        console.log('[notify-admin-job-submitted] Email sent:', result.id);
      }
    }

    // Create in-app notifications for all admins
    const notifications = adminUserIds.map(userId => ({
      user_id: userId,
      title: `New role: ${jobTitle}`,
      message: `${submittedByName} submitted "${jobTitle}" for ${companyName}. Review and approve.`,
      type: 'job_submitted',
      action_url: '/admin/job-approvals',
      category: 'jobs',
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('[notify-admin-job-submitted] Notification insert error:', notifError);
    }

    return new Response(
      JSON.stringify({ success: true, notifiedAdmins: adminEmails.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-admin-job-submitted] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

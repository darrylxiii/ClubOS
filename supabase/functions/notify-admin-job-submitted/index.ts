/**
 * Notify Admin: Job Submitted for Review
 * Sends branded email to all admins and creates in-app notifications
 * when a partner submits a new role for approval.
 */

import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, StatusBadge, InfoRow, Button,
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl, getEmailHeaders } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, uuidSchema, emailSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const requestSchema = z.object({
  jobId: uuidSchema,
  jobTitle: z.string().min(1).max(500).trim(),
  companyName: z.string().min(1).max(300).trim(),
  submittedByName: z.string().max(200).trim().optional().default(''),
  submittedByEmail: emailSchema.optional().default(''),
  employmentType: z.string().max(100).optional().default(''),
  location: z.string().max(300).optional().default(''),
  department: z.string().max(200).trim().optional(),
  seniorityLevel: z.string().max(100).optional(),
  urgency: z.string().max(100).optional(),
});

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

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, requestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const {
    jobId, jobTitle: rawJobTitle, companyName: rawCompanyName, submittedByName: rawSubmittedByName,
    submittedByEmail, employmentType, location, department: rawDepartment, seniorityLevel, urgency,
  } = parsed.data;

  // Sanitize user-supplied text for HTML embedding
  const jobTitle = sanitizeForEmail(rawJobTitle);
  const companyName = sanitizeForEmail(rawCompanyName);
  const submittedByName = sanitizeForEmail(rawSubmittedByName);
  const department = rawDepartment ? sanitizeForEmail(rawDepartment) : undefined;

  console.log(`[notify-admin-job-submitted] New role: ${jobTitle} at ${companyName}`);

  // Fetch admin users
  const { data: adminRoles, error: rolesError } = await ctx.supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (rolesError || !adminRoles?.length) {
    console.warn('[notify-admin-job-submitted] No admin users found:', rolesError);
    return new Response(
      JSON.stringify({ success: false, error: 'No admin users found' }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const adminUserIds = adminRoles.map(r => r.user_id);

  // Fetch admin profiles for emails
  const { data: adminProfiles } = await ctx.supabase
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
    try {
      const result = await sendEmail({
        from: EMAIL_SENDERS.partners,
        to: adminEmails,
        subject: `New role submitted for review: ${jobTitle}`,
        html: htmlContent,
        headers: getEmailHeaders(),
      });
      console.log('[notify-admin-job-submitted] Email sent:', result.id);
    } catch (emailErr) {
      console.error('[notify-admin-job-submitted] Email send error:', emailErr);
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

  const { error: notifError } = await ctx.supabase
    .from('notifications')
    .insert(notifications);

  if (notifError) {
    console.error('[notify-admin-job-submitted] Notification insert error:', notifError);
  }

  return new Response(
    JSON.stringify({ success: true, notifiedAdmins: adminEmails.length }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));

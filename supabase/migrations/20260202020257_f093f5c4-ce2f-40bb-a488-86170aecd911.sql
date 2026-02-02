-- =============================================
-- EMAIL NOTIFICATION MANAGEMENT SYSTEM
-- =============================================

-- 1. Create email_notification_types table (registry of all notification types)
CREATE TABLE public.email_notification_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'system',
  default_enabled BOOLEAN NOT NULL DEFAULT true,
  allow_user_override BOOLEAN NOT NULL DEFAULT true,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  edge_function TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create email_notification_assignments table (who gets what)
CREATE TABLE public.email_notification_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type_id UUID NOT NULL REFERENCES public.email_notification_types(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('role', 'user', 'all')),
  role TEXT,
  user_id UUID,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'push', 'both')),
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_assignment CHECK (
    (assignment_type = 'role' AND role IS NOT NULL AND user_id IS NULL) OR
    (assignment_type = 'user' AND user_id IS NOT NULL AND role IS NULL) OR
    (assignment_type = 'all' AND role IS NULL AND user_id IS NULL)
  )
);

-- 3. Create email_notification_audit_log table (comprehensive audit trail)
CREATE TABLE public.email_notification_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('assigned', 'unassigned', 'enabled', 'disabled', 'sent', 'failed', 'created', 'updated', 'deleted')),
  notification_type_id UUID REFERENCES public.email_notification_types(id) ON DELETE SET NULL,
  notification_type_key TEXT,
  target_user_id UUID,
  target_role TEXT,
  performed_by UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_notification_types_category ON public.email_notification_types(category);
CREATE INDEX idx_notification_types_is_active ON public.email_notification_types(is_active);
CREATE INDEX idx_notification_assignments_type_id ON public.email_notification_assignments(notification_type_id);
CREATE INDEX idx_notification_assignments_role ON public.email_notification_assignments(role) WHERE role IS NOT NULL;
CREATE INDEX idx_notification_assignments_user_id ON public.email_notification_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notification_audit_log_action ON public.email_notification_audit_log(action);
CREATE INDEX idx_notification_audit_log_type_id ON public.email_notification_audit_log(notification_type_id);
CREATE INDEX idx_notification_audit_log_created_at ON public.email_notification_audit_log(created_at DESC);
CREATE INDEX idx_notification_audit_log_performed_by ON public.email_notification_audit_log(performed_by);

-- Enable RLS on all tables
ALTER TABLE public.email_notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notification_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notification_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_notification_types
-- Admins and strategists can read all notification types (using user_roles table)
CREATE POLICY "Admins and strategists can view notification types"
ON public.email_notification_types
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'strategist')
  )
);

-- Only admins can manage notification types
CREATE POLICY "Admins can manage notification types"
ON public.email_notification_types
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- RLS Policies for email_notification_assignments
-- Admins and strategists can view all assignments
CREATE POLICY "Admins and strategists can view assignments"
ON public.email_notification_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'strategist')
  )
);

-- Users can view their own assignments
CREATE POLICY "Users can view their own assignments"
ON public.email_notification_assignments
FOR SELECT
USING (user_id = auth.uid());

-- Only admins can manage assignments
CREATE POLICY "Admins can manage assignments"
ON public.email_notification_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- RLS Policies for email_notification_audit_log
-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs"
ON public.email_notification_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.email_notification_audit_log
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_email_notification_types_updated_at
BEFORE UPDATE ON public.email_notification_types
FOR EACH ROW EXECUTE FUNCTION public.update_notification_updated_at();

CREATE TRIGGER update_email_notification_assignments_updated_at
BEFORE UPDATE ON public.email_notification_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_notification_updated_at();

-- =============================================
-- SEED INITIAL NOTIFICATION TYPES
-- =============================================

INSERT INTO public.email_notification_types (key, name, description, category, priority, edge_function, default_enabled, allow_user_override) VALUES
-- Applications
('application_submitted', 'Application Submitted', 'Notification sent when a new application is submitted', 'applications', 'normal', 'send-application-submitted-email', true, true),
('application_status_change', 'Application Status Changed', 'Notification when application status changes (approved, rejected, etc.)', 'applications', 'normal', 'send-notification-email', true, true),
('application_shortlisted', 'Application Shortlisted', 'Notification when a candidate is shortlisted for a role', 'applications', 'high', 'send-notification-email', true, true),

-- Bookings & Meetings
('booking_confirmation', 'Booking Confirmation', 'Confirmation email after a booking is made', 'bookings', 'normal', 'send-booking-confirmation', true, true),
('booking_reminder', 'Booking Reminder', 'Reminder email before a scheduled booking', 'bookings', 'normal', 'send-booking-reminder-email', true, true),
('booking_cancelled', 'Booking Cancelled', 'Notification when a booking is cancelled', 'bookings', 'normal', 'send-booking-confirmation', true, true),
('meeting_invitation', 'Meeting Invitation', 'Invitation to join a meeting', 'bookings', 'normal', 'send-meeting-invitation-email', true, true),
('meeting_summary', 'Meeting Summary', 'Summary email after a meeting concludes', 'bookings', 'normal', 'send-meeting-summary-email', true, true),

-- Security
('security_alert', 'Security Alert', 'Critical security notifications (suspicious login, password breach, etc.)', 'security', 'critical', 'send-security-alert', true, false),
('password_reset', 'Password Reset', 'Password reset request email', 'security', 'high', 'send-password-reset-email', true, false),
('password_changed', 'Password Changed', 'Confirmation when password is changed', 'security', 'normal', 'send-password-changed-email', true, false),
('login_notification', 'New Login Notification', 'Notification of a new login from unrecognized device', 'security', 'high', 'send-security-alert', true, true),

-- Approvals
('member_approved', 'Member Approved', 'Notification when membership application is approved', 'approvals', 'high', 'send-approval-notification', true, false),
('member_declined', 'Member Declined', 'Notification when membership application is declined', 'approvals', 'high', 'send-approval-notification', true, false),
('job_approval_needed', 'Job Approval Needed', 'Notification to admins when a job needs approval', 'approvals', 'high', 'send-notification-email', true, true),

-- System
('system_notification', 'System Notification', 'General system notifications', 'system', 'normal', 'send-notification-email', true, true),
('weekly_digest', 'Weekly Digest', 'Weekly summary of activity', 'system', 'low', 'send-notification-email', true, true),
('welcome_email', 'Welcome Email', 'Welcome email for new members', 'system', 'normal', 'send-notification-email', true, false),
('account_deactivated', 'Account Deactivated', 'Notification when account is deactivated', 'system', 'high', 'send-notification-email', true, false),

-- Communications
('new_message', 'New Message', 'Notification of a new message received', 'communications', 'normal', 'send-notification-email', true, true),
('mention_notification', 'Mention Notification', 'Notification when mentioned in a comment or message', 'communications', 'normal', 'send-notification-email', true, true);

-- =============================================
-- SEED DEFAULT ROLE-BASED ASSIGNMENTS
-- =============================================

-- Security alerts for admins and strategists only
INSERT INTO public.email_notification_assignments (notification_type_id, assignment_type, role, is_enabled, channel)
SELECT id, 'role', 'admin', true, 'email'
FROM public.email_notification_types WHERE key = 'security_alert';

INSERT INTO public.email_notification_assignments (notification_type_id, assignment_type, role, is_enabled, channel)
SELECT id, 'role', 'strategist', true, 'email'
FROM public.email_notification_types WHERE key = 'security_alert';

-- Job approval needed for admins only
INSERT INTO public.email_notification_assignments (notification_type_id, assignment_type, role, is_enabled, channel)
SELECT id, 'role', 'admin', true, 'email'
FROM public.email_notification_types WHERE key = 'job_approval_needed';

-- Meeting summary for admins, strategists, and partners
INSERT INTO public.email_notification_assignments (notification_type_id, assignment_type, role, is_enabled, channel)
SELECT id, 'role', 'admin', true, 'email'
FROM public.email_notification_types WHERE key = 'meeting_summary';

INSERT INTO public.email_notification_assignments (notification_type_id, assignment_type, role, is_enabled, channel)
SELECT id, 'role', 'strategist', true, 'email'
FROM public.email_notification_types WHERE key = 'meeting_summary';

INSERT INTO public.email_notification_assignments (notification_type_id, assignment_type, role, is_enabled, channel)
SELECT id, 'role', 'partner', true, 'email'
FROM public.email_notification_types WHERE key = 'meeting_summary';

-- Booking confirmations for all (default)
INSERT INTO public.email_notification_assignments (notification_type_id, assignment_type, is_enabled, channel)
SELECT id, 'all', true, 'email'
FROM public.email_notification_types WHERE key IN ('booking_confirmation', 'booking_reminder', 'booking_cancelled');

-- Member approval/declined for all (default)
INSERT INTO public.email_notification_assignments (notification_type_id, assignment_type, is_enabled, channel)
SELECT id, 'all', true, 'email'
FROM public.email_notification_types WHERE key IN ('member_approved', 'member_declined');

-- Welcome email for all (default)
INSERT INTO public.email_notification_assignments (notification_type_id, assignment_type, is_enabled, channel)
SELECT id, 'all', true, 'email'
FROM public.email_notification_types WHERE key = 'welcome_email';

-- Password-related for all (default, non-overridable)
INSERT INTO public.email_notification_assignments (notification_type_id, assignment_type, is_enabled, channel)
SELECT id, 'all', true, 'email'
FROM public.email_notification_types WHERE key IN ('password_reset', 'password_changed');
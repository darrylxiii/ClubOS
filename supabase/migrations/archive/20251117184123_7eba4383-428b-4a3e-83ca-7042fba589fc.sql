-- Drop existing email_templates table if it exists
DROP TABLE IF EXISTS email_templates CASCADE;

-- Create email_templates table for centralized template management
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  content_template JSONB NOT NULL,
  variables JSONB,
  is_enabled BOOLEAN DEFAULT true,
  edge_function TEXT,
  last_modified_at TIMESTAMPTZ DEFAULT now(),
  last_modified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_enabled ON email_templates(is_enabled);
CREATE INDEX idx_email_templates_key ON email_templates(template_key);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Admin read access (using user_roles table)
CREATE POLICY "Admins can read email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'company_admin', 'recruiter')
    )
  );

-- Admin update access
CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'company_admin', 'recruiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'company_admin', 'recruiter')
    )
  );

-- Admin insert access
CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'company_admin', 'recruiter')
    )
  );

-- Seed initial templates
INSERT INTO email_templates (template_key, name, description, category, subject_template, content_template, edge_function, variables) VALUES
('approval_approved', 'Member Approval - Approved', 'Email sent when a member request is approved', 'member_requests', 
  'Welcome to The Quantum Club!',
  '{"heading": "🎉 Welcome to The Quantum Club!", "intro": "Congratulations! Your application has been approved.", "candidateNextSteps": ["Darryl will contact you within 19 minutes (avg. response time)", "Schedule your initial consultation call", "Get matched with exclusive opportunities", "Access our full suite of career tools"], "partnerNextSteps": ["Darryl will reach out within 19 minutes to discuss your hiring needs", "Complete your company profile and post your first role", "Access our vetted talent pool", "Start building your team"], "ctaText": "Log In Now", "ctaUrl": "/auth"}',
  'send-approval-notification',
  '{"fullName": "Recipient full name", "requestType": "candidate or partner"}'
),
('approval_declined', 'Member Approval - Declined', 'Email sent when a member request is declined', 'member_requests',
  'Update on Your Application',
  '{"heading": "Application Update", "intro": "Thank you for your interest in The Quantum Club. After careful review, we are unable to approve your application at this time.", "showReason": true}',
  'send-approval-notification',
  '{"fullName": "Recipient full name", "declineReason": "Optional reason for decline"}'
),
('booking_confirmation', 'Booking Confirmation', 'Email sent when a booking is confirmed', 'bookings',
  'Your meeting has been confirmed',
  '{"heading": "Meeting Confirmed", "intro": "Your meeting has been successfully scheduled.", "showDetails": true, "ctaText": "View Details", "ctaUrl": "/bookings"}',
  'send-booking-confirmation',
  '{"guestName": "Guest name", "scheduledStart": "Meeting start time", "meetingLink": "Video conference link"}'
);

-- Create trigger to update last_modified_at
CREATE OR REPLACE FUNCTION update_email_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = now();
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_template_timestamp();
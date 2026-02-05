-- ============================================
-- Elite Partner Provisioning System
-- ============================================

-- Organization domain settings for auto-provisioning
CREATE TABLE IF NOT EXISTS organization_domain_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_enabled boolean DEFAULT true,
  auto_provision_users boolean DEFAULT false,
  default_role text DEFAULT 'member',
  require_admin_approval boolean DEFAULT true,
  allow_google_oauth boolean DEFAULT true,
  allow_self_signup boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, domain)
);

-- Partner provisioning audit log
CREATE TABLE IF NOT EXISTS partner_provisioning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provisioned_user_id uuid REFERENCES auth.users(id),
  provisioned_by uuid REFERENCES auth.users(id),
  company_id uuid REFERENCES companies(id),
  provision_method text NOT NULL CHECK (provision_method IN ('magic_link', 'password', 'oauth_only')),
  email_verified_by_admin boolean DEFAULT false,
  phone_verified_by_admin boolean DEFAULT false,
  invite_code_generated text,
  welcome_email_sent boolean DEFAULT false,
  welcome_email_sent_at timestamptz,
  first_login_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Extend invite_codes for organization invites
ALTER TABLE invite_codes
ADD COLUMN IF NOT EXISTS invite_type text DEFAULT 'member',
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS target_role text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS max_uses int DEFAULT 1,
ADD COLUMN IF NOT EXISTS uses_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS provisioned_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS welcome_message text;

-- Extend profiles for OAuth tracking and provisioning
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS oauth_providers text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_auth_method text DEFAULT 'magic_link',
ADD COLUMN IF NOT EXISTS provisioned_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS provisioned_at timestamptz,
ADD COLUMN IF NOT EXISTS admin_verified_email boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_verified_phone boolean DEFAULT false;

-- RLS Policies
ALTER TABLE organization_domain_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_provisioning_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage all domain settings
CREATE POLICY "admins_manage_domain_settings"
ON organization_domain_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Company owners/admins can manage their own domain settings
CREATE POLICY "company_owners_manage_domain_settings"
ON organization_domain_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.company_id = organization_domain_settings.company_id
    AND company_members.user_id = auth.uid()
    AND company_members.role IN ('owner', 'admin')
    AND company_members.is_active = true
  )
);

-- Admins can view all provisioning logs
CREATE POLICY "admins_view_provisioning_logs"
ON partner_provisioning_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Company owners can view their company's provisioning logs
CREATE POLICY "company_owners_view_provisioning_logs"
ON partner_provisioning_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.company_id = partner_provisioning_logs.company_id
    AND company_members.user_id = auth.uid()
    AND company_members.role IN ('owner', 'admin')
    AND company_members.is_active = true
  )
);

-- Service role can insert provisioning logs
CREATE POLICY "service_insert_provisioning_logs"
ON partner_provisioning_logs FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_domain_settings_company ON organization_domain_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_org_domain_settings_domain ON organization_domain_settings(domain);
CREATE INDEX IF NOT EXISTS idx_provisioning_logs_company ON partner_provisioning_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_logs_user ON partner_provisioning_logs(provisioned_user_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_company ON invite_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_type ON invite_codes(invite_type);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_org_domain_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_org_domain_settings_updated_at ON organization_domain_settings;
CREATE TRIGGER trigger_update_org_domain_settings_updated_at
  BEFORE UPDATE ON organization_domain_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_org_domain_settings_updated_at();
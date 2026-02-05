-- Add missing columns to partner_provisioning_logs
ALTER TABLE partner_provisioning_logs
ADD COLUMN IF NOT EXISTS assigned_strategist_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS welcome_email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

-- Add index on provisioned_by for admin auditing
CREATE INDEX IF NOT EXISTS idx_partner_provisioning_logs_provisioned_by 
ON partner_provisioning_logs(provisioned_by);

-- Add index on assigned_strategist_id for strategist queries
CREATE INDEX IF NOT EXISTS idx_partner_provisioning_logs_strategist 
ON partner_provisioning_logs(assigned_strategist_id);

-- Add assigned_strategist_id to profiles if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS assigned_strategist_id uuid REFERENCES auth.users(id);

-- Create index for profiles strategist lookup
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_strategist 
ON profiles(assigned_strategist_id) 
WHERE assigned_strategist_id IS NOT NULL;
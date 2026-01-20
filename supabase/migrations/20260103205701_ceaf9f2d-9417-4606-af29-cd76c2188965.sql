-- Create sourcing_credits table for split scenarios
CREATE TABLE IF NOT EXISTS sourcing_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  credit_type TEXT NOT NULL DEFAULT 'sourcer',
  credit_percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  UNIQUE(application_id, user_id, credit_type)
);

-- Enable RLS
ALTER TABLE sourcing_credits ENABLE ROW LEVEL SECURITY;

-- RLS policies for sourcing_credits
CREATE POLICY "Admins and strategists can view sourcing_credits"
  ON sourcing_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can insert sourcing_credits"
  ON sourcing_credits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins can update sourcing_credits"
  ON sourcing_credits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Add sourcing and salary variance columns to placement_fees
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS sourced_by UUID;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS sourcer_name TEXT;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS original_sourced_by UUID;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS sourcer_override_reason TEXT;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS estimated_salary_min NUMERIC;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS estimated_salary_max NUMERIC;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS salary_variance_percent NUMERIC;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS salary_variance_direction TEXT;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS closed_by UUID;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS closer_name TEXT;

-- Add sourcing and salary variance columns to job_closures
ALTER TABLE job_closures ADD COLUMN IF NOT EXISTS sourced_by UUID;
ALTER TABLE job_closures ADD COLUMN IF NOT EXISTS sourcer_name TEXT;
ALTER TABLE job_closures ADD COLUMN IF NOT EXISTS original_sourced_by UUID;
ALTER TABLE job_closures ADD COLUMN IF NOT EXISTS sourcer_override_reason TEXT;
ALTER TABLE job_closures ADD COLUMN IF NOT EXISTS estimated_salary_min NUMERIC;
ALTER TABLE job_closures ADD COLUMN IF NOT EXISTS estimated_salary_max NUMERIC;
ALTER TABLE job_closures ADD COLUMN IF NOT EXISTS salary_variance_percent NUMERIC;
ALTER TABLE job_closures ADD COLUMN IF NOT EXISTS closer_name TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sourcing_credits_application ON sourcing_credits(application_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_credits_user ON sourcing_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_placement_fees_sourced_by ON placement_fees(sourced_by);
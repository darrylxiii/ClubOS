-- Phase 1: Add continuous pipeline columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_continuous BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_hire_count INTEGER DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hired_count INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS continuous_started_at TIMESTAMPTZ;

-- Phase 2: Create continuous_pipeline_hires table for tracking individual hires
CREATE TABLE IF NOT EXISTS continuous_pipeline_hires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  hire_number INTEGER NOT NULL,
  hired_at TIMESTAMPTZ DEFAULT now(),
  actual_salary NUMERIC,
  placement_fee NUMERIC,
  placement_fee_id UUID REFERENCES placement_fees(id) ON DELETE SET NULL,
  cohort_start_date DATE DEFAULT CURRENT_DATE,
  days_to_fill INTEGER,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: Add columns to placement_fees for continuous pipeline linkage
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS continuous_hire_id UUID REFERENCES continuous_pipeline_hires(id) ON DELETE SET NULL;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS hire_sequence INTEGER;

-- Phase 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_continuous_pipeline_hires_job_id ON continuous_pipeline_hires(job_id);
CREATE INDEX IF NOT EXISTS idx_continuous_pipeline_hires_candidate_id ON continuous_pipeline_hires(candidate_id);
CREATE INDEX IF NOT EXISTS idx_continuous_pipeline_hires_hired_at ON continuous_pipeline_hires(hired_at);
CREATE INDEX IF NOT EXISTS idx_jobs_is_continuous ON jobs(is_continuous) WHERE is_continuous = true;

-- Phase 5: Enable RLS
ALTER TABLE continuous_pipeline_hires ENABLE ROW LEVEL SECURITY;

-- Phase 6: RLS Policies for continuous_pipeline_hires
CREATE POLICY "Admins and strategists can view all continuous hires"
ON continuous_pipeline_hires FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "Company members can view their company continuous hires"
ON continuous_pipeline_hires FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.company_id = j.company_id
    WHERE j.id = continuous_pipeline_hires.job_id
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Admins and strategists can insert continuous hires"
ON continuous_pipeline_hires FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "Company members can insert continuous hires for their jobs"
ON continuous_pipeline_hires FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.company_id = j.company_id
    WHERE j.id = continuous_pipeline_hires.job_id
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Admins can update continuous hires"
ON continuous_pipeline_hires FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete continuous hires"
ON continuous_pipeline_hires FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Phase 7: Create function to increment hired_count
CREATE OR REPLACE FUNCTION increment_continuous_hire_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE jobs 
  SET hired_count = hired_count + 1,
      updated_at = now()
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;

-- Phase 8: Create trigger for auto-incrementing hired_count
DROP TRIGGER IF EXISTS trigger_increment_continuous_hire ON continuous_pipeline_hires;
CREATE TRIGGER trigger_increment_continuous_hire
AFTER INSERT ON continuous_pipeline_hires
FOR EACH ROW
EXECUTE FUNCTION increment_continuous_hire_count();

-- Phase 9: Add audit log action type for continuous hires
-- (pipeline_audit_logs already exists, just need to use 'continuous_hire_made' action)
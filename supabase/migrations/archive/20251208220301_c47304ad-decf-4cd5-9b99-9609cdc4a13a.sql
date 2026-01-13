
-- Employee Profiles table (extends TQC staff info)
CREATE TABLE IF NOT EXISTS public.employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  employee_number TEXT UNIQUE,
  department TEXT,
  job_title TEXT NOT NULL,
  manager_id UUID REFERENCES public.employee_profiles(id),
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
  start_date DATE,
  base_salary NUMERIC(12,2),
  salary_currency TEXT DEFAULT 'EUR',
  commission_structure TEXT DEFAULT 'percentage' CHECK (commission_structure IN ('percentage', 'tiered', 'hybrid', 'fixed')),
  commission_percentage NUMERIC(5,2) DEFAULT 5.00,
  annual_bonus_target NUMERIC(12,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee Targets table (goals per period)
CREATE TABLE IF NOT EXISTS public.employee_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue_target NUMERIC(12,2),
  placements_target INTEGER,
  hours_target INTEGER,
  interviews_target INTEGER,
  candidates_sourced_target INTEGER,
  revenue_achieved NUMERIC(12,2) DEFAULT 0,
  placements_achieved INTEGER DEFAULT 0,
  hours_achieved NUMERIC(10,2) DEFAULT 0,
  interviews_achieved INTEGER DEFAULT 0,
  candidates_sourced_achieved INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee Commissions table (earned commissions)
CREATE TABLE IF NOT EXISTS public.employee_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('placement', 'referral', 'bonus', 'override', 'quarterly', 'annual')),
  source_id UUID,
  gross_amount NUMERIC(12,2) NOT NULL,
  net_amount NUMERIC(12,2),
  placement_fee_base NUMERIC(12,2),
  commission_rate NUMERIC(5,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  candidate_name TEXT,
  company_name TEXT,
  job_title TEXT,
  period_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhance recruiter_bonuses if columns don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_bonuses' AND column_name = 'bonus_category') THEN
    ALTER TABLE public.recruiter_bonuses ADD COLUMN bonus_category TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_bonuses' AND column_name = 'target_id') THEN
    ALTER TABLE public.recruiter_bonuses ADD COLUMN target_id UUID REFERENCES public.employee_targets(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_bonuses' AND column_name = 'achievement_percentage') THEN
    ALTER TABLE public.recruiter_bonuses ADD COLUMN achievement_percentage NUMERIC(5,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_bonuses' AND column_name = 'status') THEN
    ALTER TABLE public.recruiter_bonuses ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_bonuses' AND column_name = 'approved_by') THEN
    ALTER TABLE public.recruiter_bonuses ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_bonuses' AND column_name = 'approved_at') THEN
    ALTER TABLE public.recruiter_bonuses ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_profiles
CREATE POLICY "Employees can view their own profile"
  ON public.employee_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view direct reports"
  ON public.employee_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_profiles ep 
      WHERE ep.user_id = auth.uid() 
      AND public.employee_profiles.manager_id = ep.id
    )
  );

CREATE POLICY "Admins can manage all employee profiles"
  ON public.employee_profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for employee_targets
CREATE POLICY "Employees can view their own targets"
  ON public.employee_targets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_profiles ep 
      WHERE ep.id = employee_id AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view direct reports targets"
  ON public.employee_targets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_profiles ep 
      JOIN public.employee_profiles managed ON managed.manager_id = ep.id
      WHERE ep.user_id = auth.uid() AND managed.id = employee_id
    )
  );

CREATE POLICY "Admins can manage all targets"
  ON public.employee_targets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for employee_commissions
CREATE POLICY "Employees can view their own commissions"
  ON public.employee_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_profiles ep 
      WHERE ep.id = employee_id AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view and approve direct reports commissions"
  ON public.employee_commissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_profiles ep 
      JOIN public.employee_profiles managed ON managed.manager_id = ep.id
      WHERE ep.user_id = auth.uid() AND managed.id = employee_id
    )
  );

CREATE POLICY "Admins can manage all commissions"
  ON public.employee_commissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_profiles_user_id ON public.employee_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_manager_id ON public.employee_profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_employee_targets_employee_id ON public.employee_targets(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_targets_period ON public.employee_targets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_employee_id ON public.employee_commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_status ON public.employee_commissions(status);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_period ON public.employee_commissions(period_date);

-- Function to get employee metrics
CREATE OR REPLACE FUNCTION public.get_employee_metrics(p_employee_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_start_date DATE := COALESCE(p_start_date, date_trunc('year', CURRENT_DATE)::DATE);
  v_end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  SELECT json_build_object(
    'total_commissions', COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN gross_amount ELSE 0 END), 0),
    'pending_commissions', COALESCE(SUM(CASE WHEN status = 'pending' THEN gross_amount ELSE 0 END), 0),
    'paid_commissions', COALESCE(SUM(CASE WHEN status = 'paid' THEN gross_amount ELSE 0 END), 0),
    'placement_count', COUNT(CASE WHEN source_type = 'placement' THEN 1 END),
    'commission_count', COUNT(*)
  )
  INTO result
  FROM employee_commissions
  WHERE employee_id = p_employee_id
    AND period_date BETWEEN v_start_date AND v_end_date;
  
  RETURN result;
END;
$$;

-- Function to auto-create commission on placement
CREATE OR REPLACE FUNCTION public.auto_create_placement_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_commission_rate NUMERIC(5,2);
  v_placement_fee NUMERIC(12,2);
  v_commission_amount NUMERIC(12,2);
  v_job RECORD;
BEGIN
  -- Only trigger on status change to 'hired'
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') THEN
    -- Get employee profile for the sourcer
    SELECT ep.id, ep.commission_percentage
    INTO v_employee_id, v_commission_rate
    FROM employee_profiles ep
    WHERE ep.user_id = NEW.sourced_by;
    
    IF v_employee_id IS NOT NULL THEN
      -- Get job details for placement fee
      SELECT j.*, c.fee_percentage
      INTO v_job
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE j.id = NEW.job_id;
      
      -- Calculate placement fee (salary * fee %)
      v_placement_fee := COALESCE(v_job.salary_max, 75000) * COALESCE(v_job.fee_percentage, 20) / 100;
      v_commission_amount := v_placement_fee * COALESCE(v_commission_rate, 5) / 100;
      
      -- Create commission record
      INSERT INTO employee_commissions (
        employee_id, source_type, source_id, gross_amount,
        placement_fee_base, commission_rate, candidate_name,
        company_name, job_title, period_date
      ) VALUES (
        v_employee_id, 'placement', NEW.id, v_commission_amount,
        v_placement_fee, v_commission_rate, NEW.candidate_full_name,
        NEW.company_name, NEW.position, CURRENT_DATE
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto commission
DROP TRIGGER IF EXISTS trg_auto_create_placement_commission ON public.applications;
CREATE TRIGGER trg_auto_create_placement_commission
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_placement_commission();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_employee_metrics TO authenticated;

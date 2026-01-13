-- Create recruiter activity metrics table for tracking daily recruiter performance
CREATE TABLE public.recruiter_activity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Outreach & Contact Metrics
  candidates_outreached INTEGER DEFAULT 0,
  candidates_responded INTEGER DEFAULT 0,
  candidates_spoken INTEGER DEFAULT 0,
  
  -- Pipeline Metrics
  candidates_added INTEGER DEFAULT 0,
  candidates_screened INTEGER DEFAULT 0,
  candidates_submitted INTEGER DEFAULT 0,
  candidates_interviewed INTEGER DEFAULT 0,
  candidates_placed INTEGER DEFAULT 0,
  
  -- Activity Metrics
  linkedin_searches INTEGER DEFAULT 0,
  sourcing_hours NUMERIC(5,2) DEFAULT 0,
  client_calls INTEGER DEFAULT 0,
  candidate_calls INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  meetings_held INTEGER DEFAULT 0,
  
  -- Revenue Metrics
  placement_revenue NUMERIC(12,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(employee_id, date)
);

-- Enable RLS
ALTER TABLE public.recruiter_activity_metrics ENABLE ROW LEVEL SECURITY;

-- Policies using direct role check
CREATE POLICY "Admins can view all recruiter metrics"
ON public.recruiter_activity_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Users can view own metrics"
ON public.recruiter_activity_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all recruiter metrics"
ON public.recruiter_activity_metrics FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Users can manage own metrics"
ON public.recruiter_activity_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
ON public.recruiter_activity_metrics FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_recruiter_activity_employee ON public.recruiter_activity_metrics(employee_id);
CREATE INDEX idx_recruiter_activity_user ON public.recruiter_activity_metrics(user_id);
CREATE INDEX idx_recruiter_activity_date ON public.recruiter_activity_metrics(date);

-- Function to auto-update recruiter metrics when applications change
CREATE OR REPLACE FUNCTION public.update_recruiter_metrics_on_application()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  IF NEW.sourced_by IS NOT NULL THEN
    SELECT id INTO v_employee_id FROM public.employee_profiles WHERE user_id = NEW.sourced_by LIMIT 1;
    
    IF v_employee_id IS NOT NULL THEN
      INSERT INTO public.recruiter_activity_metrics (employee_id, user_id, date, candidates_added)
      VALUES (v_employee_id, NEW.sourced_by, CURRENT_DATE, 1)
      ON CONFLICT (employee_id, date) 
      DO UPDATE SET 
        candidates_added = recruiter_activity_metrics.candidates_added + 1,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new applications
CREATE TRIGGER trg_update_recruiter_metrics_on_application
AFTER INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_recruiter_metrics_on_application();

-- Function to update metrics when application status changes to hired
CREATE OR REPLACE FUNCTION public.update_recruiter_placement_on_hire()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') AND NEW.sourced_by IS NOT NULL THEN
    SELECT id INTO v_employee_id FROM public.employee_profiles WHERE user_id = NEW.sourced_by LIMIT 1;
    
    IF v_employee_id IS NOT NULL THEN
      INSERT INTO public.recruiter_activity_metrics (employee_id, user_id, date, candidates_placed)
      VALUES (v_employee_id, NEW.sourced_by, CURRENT_DATE, 1)
      ON CONFLICT (employee_id, date) 
      DO UPDATE SET 
        candidates_placed = recruiter_activity_metrics.candidates_placed + 1,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for hire status changes
CREATE TRIGGER trg_update_recruiter_placement_on_hire
AFTER UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_recruiter_placement_on_hire();

-- RPC to get recruiter stats aggregated
CREATE OR REPLACE FUNCTION public.get_recruiter_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_candidates_added', COALESCE(SUM(candidates_added), 0),
    'total_candidates_placed', COALESCE(SUM(candidates_placed), 0),
    'total_candidates_outreached', COALESCE(SUM(candidates_outreached), 0),
    'total_candidates_spoken', COALESCE(SUM(candidates_spoken), 0),
    'total_client_calls', COALESCE(SUM(client_calls), 0),
    'total_candidate_calls', COALESCE(SUM(candidate_calls), 0),
    'total_sourcing_hours', COALESCE(SUM(sourcing_hours), 0),
    'total_placement_revenue', COALESCE(SUM(placement_revenue), 0),
    'days_active', COUNT(DISTINCT date)
  ) INTO v_result
  FROM public.recruiter_activity_metrics
  WHERE user_id = p_user_id
  AND date >= CURRENT_DATE - p_days;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
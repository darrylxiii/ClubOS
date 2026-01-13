-- ============================================
-- Pipeline Stage Mapping System
-- ============================================

-- 1. Create pipeline_stage_mappings table
CREATE TABLE IF NOT EXISTS public.pipeline_stage_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_stage_pattern TEXT NOT NULL,
  deal_stage_id UUID REFERENCES public.deal_stages(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT true,
  match_type TEXT DEFAULT 'exact' CHECK (match_type IN ('exact', 'contains', 'starts_with', 'ends_with')),
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_stage_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage pipeline stage mappings"
  ON public.pipeline_stage_mappings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Authenticated users can view pipeline stage mappings"
  ON public.pipeline_stage_mappings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Fix case mismatch in jobs.deal_stage
UPDATE public.jobs SET deal_stage = 'New' WHERE deal_stage = 'new';
UPDATE public.jobs SET deal_stage = 'Qualified' WHERE deal_stage = 'qualified';
UPDATE public.jobs SET deal_stage = 'Proposal' WHERE deal_stage = 'proposal';
UPDATE public.jobs SET deal_stage = 'Negotiation' WHERE deal_stage = 'negotiation';
UPDATE public.jobs SET deal_stage = 'Closed Won' WHERE deal_stage = 'closed won';
UPDATE public.jobs SET deal_stage = 'Closed Lost' WHERE deal_stage = 'closed lost';

-- Update default value to proper case
ALTER TABLE public.jobs ALTER COLUMN deal_stage SET DEFAULT 'New';

-- 3. Seed default mappings
INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Applied', id, 10, 'exact', 'New applications start in New stage'
FROM public.deal_stages WHERE LOWER(name) = 'new'
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Screening', id, 20, 'exact', 'Screening maps to Qualified'
FROM public.deal_stages WHERE LOWER(name) = 'qualified'
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Screen', id, 20, 'contains', 'Any screening stage maps to Qualified'
FROM public.deal_stages WHERE LOWER(name) = 'qualified'
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Interview', id, 30, 'contains', 'Interview stages map to Proposal'
FROM public.deal_stages WHERE LOWER(name) = 'proposal'
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Assessment', id, 30, 'contains', 'Assessment stages map to Proposal'
FROM public.deal_stages WHERE LOWER(name) = 'proposal'
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Technical', id, 30, 'contains', 'Technical stages map to Proposal'
FROM public.deal_stages WHERE LOWER(name) = 'proposal'
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Offer', id, 40, 'contains', 'Offer stages map to Negotiation'
FROM public.deal_stages WHERE LOWER(name) = 'negotiation'
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Final', id, 35, 'contains', 'Final round maps to Negotiation'
FROM public.deal_stages WHERE LOWER(name) = 'negotiation'
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Hired', id, 50, 'exact', 'Hired maps to Closed Won'
FROM public.deal_stages WHERE LOWER(name) = 'closed won'
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Rejected', id, 50, 'contains', 'Rejected stages map to Closed Lost'
FROM public.deal_stages WHERE LOWER(name) = 'closed lost'
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stage_mappings (job_stage_pattern, deal_stage_id, priority, match_type, description)
SELECT 'Withdrawn', id, 50, 'contains', 'Withdrawn stages map to Closed Lost'
FROM public.deal_stages WHERE LOWER(name) = 'closed lost'
ON CONFLICT DO NOTHING;

-- 4. Create function to get deal stage for a job based on its applications
CREATE OR REPLACE FUNCTION public.get_deal_stage_for_job(p_job_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_highest_stage TEXT := 'New';
  v_highest_priority INTEGER := 0;
  v_current_stage TEXT;
  v_mapped_stage TEXT;
  v_mapping RECORD;
  v_app RECORD;
BEGIN
  -- Loop through all active applications for this job
  FOR v_app IN 
    SELECT 
      a.stages,
      a.current_stage_index,
      a.status
    FROM applications a
    WHERE a.job_id = p_job_id
      AND a.status NOT IN ('rejected', 'withdrawn')
  LOOP
    -- Get the current stage name from the stages array
    IF v_app.stages IS NOT NULL AND jsonb_array_length(v_app.stages) > 0 THEN
      v_current_stage := v_app.stages->v_app.current_stage_index->>'name';
      
      IF v_current_stage IS NOT NULL THEN
        -- Find matching mapping with highest priority
        FOR v_mapping IN
          SELECT psm.priority, ds.name as deal_stage_name
          FROM pipeline_stage_mappings psm
          JOIN deal_stages ds ON ds.id = psm.deal_stage_id
          WHERE psm.is_default = true
            AND (
              (psm.match_type = 'exact' AND LOWER(v_current_stage) = LOWER(psm.job_stage_pattern))
              OR (psm.match_type = 'contains' AND LOWER(v_current_stage) LIKE '%' || LOWER(psm.job_stage_pattern) || '%')
              OR (psm.match_type = 'starts_with' AND LOWER(v_current_stage) LIKE LOWER(psm.job_stage_pattern) || '%')
              OR (psm.match_type = 'ends_with' AND LOWER(v_current_stage) LIKE '%' || LOWER(psm.job_stage_pattern))
            )
          ORDER BY psm.priority DESC
          LIMIT 1
        LOOP
          IF v_mapping.priority > v_highest_priority THEN
            v_highest_priority := v_mapping.priority;
            v_highest_stage := v_mapping.deal_stage_name;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_highest_stage;
END;
$$;

-- 5. Create trigger function to auto-update deal stage
CREATE OR REPLACE FUNCTION public.update_deal_stage_on_application_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_deal_stage TEXT;
BEGIN
  -- Get the new deal stage based on all applications
  v_new_deal_stage := get_deal_stage_for_job(COALESCE(NEW.job_id, OLD.job_id));
  
  -- Update the job's deal_stage
  UPDATE jobs
  SET deal_stage = v_new_deal_stage,
      updated_at = now()
  WHERE id = COALESCE(NEW.job_id, OLD.job_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Create trigger on applications table
DROP TRIGGER IF EXISTS trigger_update_deal_stage ON public.applications;
CREATE TRIGGER trigger_update_deal_stage
  AFTER INSERT OR UPDATE OF current_stage_index, status, stages
  ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_stage_on_application_change();

-- 7. Create function to backfill all job deal stages
CREATE OR REPLACE FUNCTION public.backfill_deal_stages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_job RECORD;
  v_new_stage TEXT;
BEGIN
  FOR v_job IN SELECT id FROM jobs WHERE status = 'published' LOOP
    v_new_stage := get_deal_stage_for_job(v_job.id);
    UPDATE jobs SET deal_stage = v_new_stage WHERE id = v_job.id;
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- 8. Run backfill for existing jobs
SELECT backfill_deal_stages();

-- 9. Create updated_at trigger for pipeline_stage_mappings
CREATE TRIGGER update_pipeline_stage_mappings_updated_at
  BEFORE UPDATE ON public.pipeline_stage_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_mappings_pattern 
  ON public.pipeline_stage_mappings(job_stage_pattern, match_type);

CREATE INDEX IF NOT EXISTS idx_pipeline_stage_mappings_deal_stage 
  ON public.pipeline_stage_mappings(deal_stage_id);
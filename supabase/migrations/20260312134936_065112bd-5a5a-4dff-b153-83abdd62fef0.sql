
-- Phase 1a: Rewrite get_deal_stage_for_job with composite scoring
-- Considers: review statuses, dynamic pipeline stages, application status, volume signals
CREATE OR REPLACE FUNCTION public.get_deal_stage_for_job(p_job_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_highest_stage TEXT := 'New';
  v_highest_priority INTEGER := 0;
  v_current_stage TEXT;
  v_mapping RECORD;
  v_app RECORD;
  v_job_stages JSONB;
  v_job_status TEXT;
  v_job_is_lost BOOLEAN;
  v_total_pipeline_stages INTEGER;
  v_partner_approved_count INTEGER := 0;
  v_internal_approved_count INTEGER := 0;
  v_has_applications BOOLEAN := false;
BEGIN
  -- Get job metadata
  SELECT status, is_lost, pipeline_stages 
  INTO v_job_status, v_job_is_lost, v_job_stages
  FROM jobs WHERE id = p_job_id;
  
  -- Terminal state: job marked as lost
  IF v_job_is_lost = true THEN
    RETURN 'Closed Lost';
  END IF;
  
  -- Terminal state: job closed and not lost = won
  IF v_job_status = 'closed' AND v_job_is_lost = false THEN
    -- Check if any application was hired
    IF EXISTS (
      SELECT 1 FROM applications 
      WHERE job_id = p_job_id AND status = 'hired'
    ) THEN
      RETURN 'Closed Won';
    END IF;
    -- Closed but no hired candidate — classify as lost
    RETURN 'Closed Lost';
  END IF;
  
  -- Count total pipeline stages for positional fallback
  v_total_pipeline_stages := COALESCE(jsonb_array_length(v_job_stages), 0);
  
  -- Loop through all non-terminal applications for this job
  FOR v_app IN 
    SELECT 
      a.current_stage_index,
      a.status,
      a.internal_review_status,
      a.partner_review_status
    FROM applications a
    WHERE a.job_id = p_job_id
      AND a.status NOT IN ('rejected', 'withdrawn', 'closed')
  LOOP
    v_has_applications := true;
    
    -- Priority 100: Any hired application → Closed Won
    IF v_app.status = 'hired' THEN
      RETURN 'Closed Won';
    END IF;
    
    -- Count review approvals
    IF v_app.internal_review_status = 'approved' THEN
      v_internal_approved_count := v_internal_approved_count + 1;
    END IF;
    IF v_app.partner_review_status = 'approved' THEN
      v_partner_approved_count := v_partner_approved_count + 1;
    END IF;
    
    -- Check pipeline stage name against mappings (existing pattern matching)
    IF v_total_pipeline_stages > 0 
       AND v_app.current_stage_index >= 0 
       AND v_app.current_stage_index < v_total_pipeline_stages THEN
      v_current_stage := v_job_stages->v_app.current_stage_index->>'name';
      
      IF v_current_stage IS NOT NULL THEN
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
        
        -- Positional fallback: if no pattern matched and candidate is beyond first stage
        IF v_highest_priority < 15 AND v_app.current_stage_index > 0 AND v_total_pipeline_stages > 1 THEN
          DECLARE
            v_position_pct NUMERIC;
          BEGIN
            v_position_pct := v_app.current_stage_index::NUMERIC / v_total_pipeline_stages::NUMERIC;
            IF v_position_pct >= 0.75 AND v_highest_priority < 40 THEN
              v_highest_priority := 38;
              v_highest_stage := 'Negotiation';
            ELSIF v_position_pct >= 0.50 AND v_highest_priority < 30 THEN
              v_highest_priority := 28;
              v_highest_stage := 'Proposal';
            ELSIF v_position_pct >= 0.25 AND v_highest_priority < 20 THEN
              v_highest_priority := 18;
              v_highest_stage := 'Qualified';
            END IF;
          END;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  -- Review-based signals (applied AFTER pipeline stage checks, can only upgrade)
  -- 5+ partner-approved candidates → at least Proposal
  IF v_partner_approved_count >= 5 AND v_highest_priority < 30 THEN
    v_highest_priority := 29;
    v_highest_stage := 'Proposal';
  -- Any partner-approved → at least Qualified
  ELSIF v_partner_approved_count > 0 AND v_highest_priority < 20 THEN
    v_highest_priority := 25;
    v_highest_stage := 'Qualified';
  -- Any internal-approved → at least Qualified
  ELSIF v_internal_approved_count > 0 AND v_highest_priority < 20 THEN
    v_highest_priority := 22;
    v_highest_stage := 'Qualified';
  END IF;
  
  RETURN v_highest_stage;
END;
$$;

-- Phase 1b: Fix trigger to also fire on review status changes
DROP TRIGGER IF EXISTS trigger_update_deal_stage ON public.applications;
CREATE TRIGGER trigger_update_deal_stage
  AFTER INSERT OR UPDATE OF current_stage_index, status, stages, internal_review_status, partner_review_status
  ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_stage_on_application_change();

-- Phase 1c: Fix is_terminal on Closed Won and Closed Lost
UPDATE public.deal_stages SET is_terminal = true WHERE name IN ('Closed Won', 'Closed Lost');

-- Phase 1d: Delete duplicate Assessment mapping (keep the earlier one)
DELETE FROM public.pipeline_stage_mappings 
WHERE id = '0d335ba1-af47-4a15-af1c-a0d6276d6de7';

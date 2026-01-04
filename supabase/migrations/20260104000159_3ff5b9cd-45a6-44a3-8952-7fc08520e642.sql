-- Fix the get_deal_stage_for_job function to use jobs.pipeline_stages instead of applications.stages
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
  v_mapping RECORD;
  v_app RECORD;
  v_job_stages JSONB;
BEGIN
  -- Get the JOB'S pipeline stages (not application.stages!)
  SELECT pipeline_stages INTO v_job_stages
  FROM jobs WHERE id = p_job_id;
  
  -- Handle jobs with no pipeline stages defined
  IF v_job_stages IS NULL OR jsonb_array_length(v_job_stages) = 0 THEN
    RETURN 'New';
  END IF;
  
  -- Loop through all active applications for this job
  FOR v_app IN 
    SELECT 
      a.current_stage_index,
      a.status
    FROM applications a
    WHERE a.job_id = p_job_id
      AND a.status NOT IN ('rejected', 'withdrawn', 'closed')
  LOOP
    -- Get the current stage name from the JOB'S pipeline_stages
    IF v_app.current_stage_index >= 0 
       AND v_app.current_stage_index < jsonb_array_length(v_job_stages) THEN
      v_current_stage := v_job_stages->v_app.current_stage_index->>'name';
      
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

-- Add additional pipeline stage mappings for common custom stage names
INSERT INTO pipeline_stage_mappings 
  (job_stage_pattern, deal_stage_id, priority, is_default, match_type, description)
SELECT 
  'Assessment',
  id,
  30,
  true,
  'contains',
  'All assessment stages map to Proposal'
FROM deal_stages WHERE name = 'Proposal'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stage_mappings 
  (job_stage_pattern, deal_stage_id, priority, is_default, match_type, description)
SELECT 
  'Face to Face',
  id,
  35,
  true,
  'contains',
  'In-person meetings map to Negotiation'
FROM deal_stages WHERE name = 'Negotiation'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stage_mappings 
  (job_stage_pattern, deal_stage_id, priority, is_default, match_type, description)
SELECT 
  'Round',
  id,
  32,
  true,
  'contains',
  'Interview rounds map to Proposal'
FROM deal_stages WHERE name = 'Proposal'
ON CONFLICT DO NOTHING;
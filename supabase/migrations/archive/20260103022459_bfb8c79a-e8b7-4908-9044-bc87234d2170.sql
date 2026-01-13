-- Phase 2: Placement Fee Workflow
-- Create function and trigger to auto-create placement fee when application status becomes 'hired'

-- Function to calculate and create placement fee
CREATE OR REPLACE FUNCTION public.create_placement_fee_on_hire()
RETURNS TRIGGER AS $$
DECLARE
  v_fee_config RECORD;
  v_candidate RECORD;
  v_job RECORD;
  v_fee_amount NUMERIC;
  v_company_id UUID;
BEGIN
  -- Only trigger when status changes to 'hired'
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') THEN
    
    -- Get job details
    SELECT j.*, c.id as company_id, c.name as company_name
    INTO v_job
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE j.id = NEW.job_id;
    
    IF v_job IS NULL THEN
      RETURN NEW;
    END IF;
    
    v_company_id := v_job.company_id;
    
    -- Get fee configuration for this company
    SELECT * INTO v_fee_config
    FROM company_fee_configurations
    WHERE company_id = v_company_id
    AND is_active = true
    ORDER BY effective_from DESC
    LIMIT 1;
    
    -- Calculate fee amount (default 20% if no config)
    IF v_fee_config IS NOT NULL THEN
      -- Calculate based on candidate salary if available
      IF v_job.salary_min IS NOT NULL THEN
        v_fee_amount := v_job.salary_min * (COALESCE(v_fee_config.fee_percentage, 20) / 100);
      ELSE
        v_fee_amount := 10000; -- Default fee if no salary info
      END IF;
    ELSE
      v_fee_amount := 10000; -- Default fee
    END IF;
    
    -- Check if placement fee already exists for this application
    IF NOT EXISTS (SELECT 1 FROM placement_fees WHERE application_id = NEW.id) THEN
      -- Create placement fee record
      INSERT INTO placement_fees (
        application_id,
        job_id,
        candidate_id,
        partner_company_id,
        fee_amount,
        fee_currency,
        fee_type,
        status,
        created_by,
        notes
      ) VALUES (
        NEW.id,
        NEW.job_id,
        NEW.candidate_id,
        v_company_id,
        v_fee_amount,
        'EUR',
        COALESCE(v_fee_config.fee_type, 'percentage'),
        'pending',
        NEW.sourced_by,
        'Auto-generated on hire'
      );
      
      -- Log activity
      INSERT INTO activity_feed (
        user_id,
        company_id,
        event_type,
        event_data,
        visibility
      ) VALUES (
        NEW.sourced_by,
        v_company_id,
        'placement_fee_created',
        jsonb_build_object(
          'application_id', NEW.id,
          'job_id', NEW.job_id,
          'candidate_id', NEW.candidate_id,
          'fee_amount', v_fee_amount
        ),
        'internal'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_placement_fee_on_hire ON applications;
CREATE TRIGGER trigger_create_placement_fee_on_hire
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION create_placement_fee_on_hire();

-- Also trigger on insert if status is already 'hired'
CREATE OR REPLACE FUNCTION public.create_placement_fee_on_hire_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'hired' THEN
    -- Call the same logic
    PERFORM create_placement_fee_on_hire();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Delete the stale job_closures record that's blocking re-submission
DELETE FROM job_closures WHERE job_id = '23922219-f022-467e-91d9-3b14dc4f0aab';

-- Fix the commission trigger to use valid source_type 'placement' instead of 'placement_fee'
CREATE OR REPLACE FUNCTION calculate_commissions_on_placement_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_job RECORD;
  v_company RECORD;
  v_application RECORD;
  v_strategist_id UUID;
  v_partner_id UUID;
  v_sourcer_id UUID;
  v_strategist_rate NUMERIC;
  v_partner_rate NUMERIC;
  v_sourcer_rate NUMERIC;
  v_strategist_commission NUMERIC;
  v_partner_commission NUMERIC;
  v_sourcer_commission NUMERIC;
  v_placement_fee NUMERIC;
BEGIN
  -- Only process when placement_fee is set or updated
  IF NEW.placement_fee IS NULL OR NEW.placement_fee <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Skip if placement_fee hasn't changed (for updates)
  IF TG_OP = 'UPDATE' AND OLD.placement_fee = NEW.placement_fee THEN
    RETURN NEW;
  END IF;

  v_placement_fee := NEW.placement_fee;

  -- Get job details
  SELECT j.*, j.company_id, j.owner_id as job_owner_id
  INTO v_job
  FROM jobs j
  WHERE j.id = NEW.job_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Job not found for job_closure: %', NEW.job_id;
    RETURN NEW;
  END IF;

  -- Get company default rates
  SELECT * INTO v_company
  FROM companies
  WHERE id = v_job.company_id;

  -- Determine strategist (job owner)
  v_strategist_id := v_job.job_owner_id;
  
  -- Get strategist commission rate (from profile or company default)
  SELECT COALESCE(p.commission_rate, v_company.default_commission_rate, 10)
  INTO v_strategist_rate
  FROM profiles p
  WHERE p.id = v_strategist_id;

  IF v_strategist_rate IS NULL THEN
    v_strategist_rate := COALESCE(v_company.default_commission_rate, 10);
  END IF;

  -- Calculate and insert strategist commission
  IF v_strategist_id IS NOT NULL THEN
    v_strategist_commission := v_placement_fee * (v_strategist_rate / 100);
    
    INSERT INTO employee_commissions (
      employee_id, job_id, application_id, source_type, 
      commission_rate, base_amount, calculated_amount, status
    ) VALUES (
      v_strategist_id, NEW.job_id, NEW.hired_application_id, 'placement',
      v_strategist_rate, v_placement_fee, v_strategist_commission, 'pending'
    )
    ON CONFLICT (employee_id, application_id, source_type) 
    DO UPDATE SET 
      commission_rate = EXCLUDED.commission_rate,
      base_amount = EXCLUDED.base_amount,
      calculated_amount = EXCLUDED.calculated_amount,
      updated_at = NOW();
  END IF;

  -- Get application details for sourcer
  IF NEW.hired_application_id IS NOT NULL THEN
    SELECT * INTO v_application
    FROM applications
    WHERE id = NEW.hired_application_id;

    -- Determine sourcer (who sourced/referred the candidate)
    v_sourcer_id := v_application.sourced_by;
    
    -- If no sourcer, check if candidate was created by someone
    IF v_sourcer_id IS NULL AND v_application.candidate_id IS NOT NULL THEN
      SELECT created_by INTO v_sourcer_id
      FROM candidate_profiles
      WHERE id = v_application.candidate_id;
    END IF;

    -- Calculate sourcer commission if different from strategist
    IF v_sourcer_id IS NOT NULL AND v_sourcer_id != v_strategist_id THEN
      -- Get sourcer commission rate
      SELECT COALESCE(p.commission_rate, v_company.default_commission_rate, 5)
      INTO v_sourcer_rate
      FROM profiles p
      WHERE p.id = v_sourcer_id;

      IF v_sourcer_rate IS NULL THEN
        v_sourcer_rate := 5; -- Default sourcer rate
      END IF;

      v_sourcer_commission := v_placement_fee * (v_sourcer_rate / 100);
      
      INSERT INTO employee_commissions (
        employee_id, job_id, application_id, source_type,
        commission_rate, base_amount, calculated_amount, status
      ) VALUES (
        v_sourcer_id, NEW.job_id, NEW.hired_application_id, 'placement',
        v_sourcer_rate, v_placement_fee, v_sourcer_commission, 'pending'
      )
      ON CONFLICT (employee_id, application_id, source_type)
      DO UPDATE SET
        commission_rate = EXCLUDED.commission_rate,
        base_amount = EXCLUDED.base_amount,
        calculated_amount = EXCLUDED.calculated_amount,
        updated_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
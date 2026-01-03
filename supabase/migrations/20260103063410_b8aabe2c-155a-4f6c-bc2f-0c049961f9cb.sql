-- Phase 2: Automated Placement Fee Generation

-- 2.1 Create or replace the trigger function for placement fee on hire
CREATE OR REPLACE FUNCTION create_placement_fee_on_hire_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_job RECORD;
  v_fee_percentage NUMERIC;
  v_fee_amount NUMERIC;
  v_base_salary NUMERIC;
  v_existing_fee UUID;
BEGIN
  -- Only process when status changes to 'hired'
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') THEN
    
    -- Check if placement fee already exists
    SELECT id INTO v_existing_fee FROM placement_fees WHERE application_id = NEW.id;
    IF v_existing_fee IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get job and company details
    SELECT 
      j.id as job_id,
      j.title,
      j.salary_min,
      j.salary_max,
      j.company_id,
      c.name as company_name,
      COALESCE(c.default_fee_percentage, 20) as company_fee_pct
    INTO v_job
    FROM jobs j
    LEFT JOIN companies c ON c.id = j.company_id
    WHERE j.id = NEW.job_id;
    
    IF v_job IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate fee
    v_base_salary := COALESCE(v_job.salary_max, v_job.salary_min, 75000);
    v_fee_percentage := v_job.company_fee_pct;
    v_fee_amount := v_base_salary * (v_fee_percentage / 100);
    
    -- Insert placement fee
    INSERT INTO placement_fees (
      application_id, 
      job_id, 
      candidate_id, 
      partner_company_id,
      fee_percentage, 
      candidate_salary, 
      fee_amount, 
      currency_code,
      status, 
      hired_date, 
      created_by,
      notes
    )
    VALUES (
      NEW.id, 
      NEW.job_id, 
      NEW.candidate_id, 
      v_job.company_id,
      v_fee_percentage, 
      v_base_salary, 
      v_fee_amount, 
      'EUR',
      'pending', 
      NOW(), 
      COALESCE(NEW.sourced_by, NEW.user_id),
      'Auto-generated on hire status change'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.2 Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_create_placement_fee_on_hire_v2 ON applications;
CREATE TRIGGER trg_create_placement_fee_on_hire_v2
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION create_placement_fee_on_hire_v2();

-- Also handle INSERT case where status is already 'hired'
DROP TRIGGER IF EXISTS trg_create_placement_fee_on_hire_insert ON applications;
CREATE TRIGGER trg_create_placement_fee_on_hire_insert
  AFTER INSERT ON applications
  FOR EACH ROW
  WHEN (NEW.status = 'hired')
  EXECUTE FUNCTION create_placement_fee_on_hire_v2();
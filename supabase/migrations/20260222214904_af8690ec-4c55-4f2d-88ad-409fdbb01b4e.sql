
CREATE OR REPLACE FUNCTION public.auto_create_placement_commission()
RETURNS trigger
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
    BEGIN
      -- Get employee profile for the sourcer
      SELECT ep.id, ep.commission_percentage
      INTO v_employee_id, v_commission_rate
      FROM employee_profiles ep
      WHERE ep.user_id = NEW.sourced_by;
      
      IF v_employee_id IS NOT NULL THEN
        -- Get job details for placement fee (FIXED: use correct column name)
        SELECT j.*, COALESCE(j.job_fee_percentage, c.placement_fee_percentage, 20) AS calculated_fee_percentage
        INTO v_job
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        WHERE j.id = NEW.job_id;
        
        -- Calculate placement fee (salary * fee %)
        v_placement_fee := COALESCE(v_job.salary_max, 75000) * COALESCE(v_job.calculated_fee_percentage, 20) / 100;
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
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'auto_create_placement_commission failed for application %: %', NEW.id, SQLERRM;
      -- Do NOT re-raise: commission is secondary, hire must succeed
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

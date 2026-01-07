-- Fix trigger function to use correct source_type value
CREATE OR REPLACE FUNCTION create_commission_on_placement_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id UUID;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_employee_name TEXT;
  v_candidate_name TEXT;
  v_company_name TEXT;
  v_job_title TEXT;
BEGIN
  -- Skip if no sourcer assigned
  IF NEW.sourced_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the employee profile for the sourcer
  SELECT ep.id, ep.commission_percentage, p.full_name
  INTO v_employee_id, v_commission_rate, v_employee_name
  FROM employee_profiles ep
  JOIN profiles p ON p.id = ep.user_id
  WHERE ep.user_id = NEW.sourced_by
  LIMIT 1;

  -- Skip if no employee profile found or no commission rate
  IF v_employee_id IS NULL OR v_commission_rate IS NULL OR v_commission_rate = 0 THEN
    RETURN NEW;
  END IF;

  -- Get context data
  SELECT full_name INTO v_candidate_name FROM profiles WHERE id = NEW.candidate_id;
  SELECT name INTO v_company_name FROM companies WHERE id = NEW.partner_company_id;
  SELECT title INTO v_job_title FROM jobs WHERE id = NEW.job_id;

  -- Calculate commission amount (fee_amount is already net, no VAT on commissions)
  v_commission_amount := NEW.fee_amount * (v_commission_rate / 100);

  -- Insert the commission record
  INSERT INTO employee_commissions (
    employee_id,
    source_type,
    source_id,
    placement_fee_id,
    placement_fee_base,
    gross_amount,
    net_amount,
    commission_rate,
    status,
    candidate_name,
    company_name,
    job_title,
    period_date,
    notes,
    commission_type
  ) VALUES (
    v_employee_id,
    'placement',
    NEW.id,
    NEW.id,
    NEW.fee_amount,
    v_commission_amount,
    v_commission_amount, -- No VAT on employee commissions
    v_commission_rate,
    'pending',
    v_candidate_name,
    v_company_name,
    v_job_title,
    NEW.hired_date,
    CONCAT('Auto-generated commission for ', COALESCE(NEW.sourcer_name, v_employee_name)),
    'sourcing'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also fix the update trigger
CREATE OR REPLACE FUNCTION update_commission_on_placement_fee_update()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id UUID;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_employee_name TEXT;
  v_candidate_name TEXT;
  v_company_name TEXT;
  v_job_title TEXT;
BEGIN
  -- Check if sourced_by changed
  IF OLD.sourced_by IS DISTINCT FROM NEW.sourced_by OR OLD.fee_amount IS DISTINCT FROM NEW.fee_amount THEN
    -- Delete existing commission for this placement fee
    DELETE FROM employee_commissions WHERE placement_fee_id = NEW.id;
    
    -- Skip if no sourcer assigned
    IF NEW.sourced_by IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get the employee profile for the sourcer
    SELECT ep.id, ep.commission_percentage, p.full_name
    INTO v_employee_id, v_commission_rate, v_employee_name
    FROM employee_profiles ep
    JOIN profiles p ON p.id = ep.user_id
    WHERE ep.user_id = NEW.sourced_by
    LIMIT 1;

    -- Skip if no employee profile found or no commission rate
    IF v_employee_id IS NULL OR v_commission_rate IS NULL OR v_commission_rate = 0 THEN
      RETURN NEW;
    END IF;

    -- Get context data
    SELECT full_name INTO v_candidate_name FROM profiles WHERE id = NEW.candidate_id;
    SELECT name INTO v_company_name FROM companies WHERE id = NEW.partner_company_id;
    SELECT title INTO v_job_title FROM jobs WHERE id = NEW.job_id;

    -- Calculate commission amount
    v_commission_amount := NEW.fee_amount * (v_commission_rate / 100);

    -- Insert the commission record
    INSERT INTO employee_commissions (
      employee_id,
      source_type,
      source_id,
      placement_fee_id,
      placement_fee_base,
      gross_amount,
      net_amount,
      commission_rate,
      status,
      candidate_name,
      company_name,
      job_title,
      period_date,
      notes,
      commission_type
    ) VALUES (
      v_employee_id,
      'placement',
      NEW.id,
      NEW.id,
      NEW.fee_amount,
      v_commission_amount,
      v_commission_amount,
      v_commission_rate,
      'pending',
      v_candidate_name,
      v_company_name,
      v_job_title,
      NEW.hired_date,
      CONCAT('Auto-generated commission for ', COALESCE(NEW.sourcer_name, v_employee_name)),
      'sourcing'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
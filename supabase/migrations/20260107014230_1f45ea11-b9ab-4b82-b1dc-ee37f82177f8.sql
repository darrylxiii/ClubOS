-- Create trigger function to auto-generate employee commissions when placement fees are created
CREATE OR REPLACE FUNCTION create_commission_on_placement_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id UUID;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_employee_name TEXT;
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

  -- Calculate commission amount (fee_amount is already net, no VAT on commissions)
  v_commission_amount := NEW.fee_amount * (v_commission_rate / 100);

  -- Insert the commission record
  INSERT INTO employee_commissions (
    employee_id,
    source_type,
    source_id,
    placement_fee_id,
    gross_amount,
    net_amount,
    commission_rate,
    currency_code,
    status,
    notes,
    period_start,
    period_end
  ) VALUES (
    v_employee_id,
    'placement_fee',
    NEW.id,
    NEW.id,
    v_commission_amount,
    v_commission_amount, -- No VAT on employee commissions
    v_commission_rate,
    NEW.currency_code,
    'pending',
    format('Auto-generated commission for %s placement (%.0f%% of €%.2f)', 
           COALESCE(NEW.sourcer_name, v_employee_name), v_commission_rate, NEW.fee_amount),
    date_trunc('month', NEW.hired_date),
    (date_trunc('month', NEW.hired_date) + interval '1 month - 1 day')::date
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on placement_fees table
DROP TRIGGER IF EXISTS trg_create_employee_commission ON placement_fees;
CREATE TRIGGER trg_create_employee_commission
  AFTER INSERT ON placement_fees
  FOR EACH ROW
  EXECUTE FUNCTION create_commission_on_placement_fee();

-- Also create trigger for updates (in case sourced_by is set after creation)
CREATE OR REPLACE FUNCTION update_commission_on_placement_fee_update()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id UUID;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_employee_name TEXT;
  v_existing_commission_id UUID;
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

    -- Calculate commission amount
    v_commission_amount := NEW.fee_amount * (v_commission_rate / 100);

    -- Insert the commission record
    INSERT INTO employee_commissions (
      employee_id,
      source_type,
      source_id,
      placement_fee_id,
      gross_amount,
      net_amount,
      commission_rate,
      currency_code,
      status,
      notes,
      period_start,
      period_end
    ) VALUES (
      v_employee_id,
      'placement_fee',
      NEW.id,
      NEW.id,
      v_commission_amount,
      v_commission_amount,
      v_commission_rate,
      NEW.currency_code,
      'pending',
      format('Auto-generated commission for %s placement (%.0f%% of €%.2f)', 
             COALESCE(NEW.sourcer_name, v_employee_name), v_commission_rate, NEW.fee_amount),
      date_trunc('month', NEW.hired_date),
      (date_trunc('month', NEW.hired_date) + interval '1 month - 1 day')::date
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_employee_commission ON placement_fees;
CREATE TRIGGER trg_update_employee_commission
  AFTER UPDATE ON placement_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_on_placement_fee_update();
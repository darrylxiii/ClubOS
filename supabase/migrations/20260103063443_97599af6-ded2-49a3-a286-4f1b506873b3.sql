-- Phase 3: Automated Commission Calculation

CREATE OR REPLACE FUNCTION calculate_commissions_on_placement_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_application RECORD;
  v_recruiter_employee RECORD;
  v_strategist_assignment RECORD;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_strategist_rate NUMERIC;
  v_strategist_amount NUMERIC;
BEGIN
  -- Get application details
  SELECT 
    a.*,
    cp.full_name as candidate_name,
    j.title as job_title,
    c.name as company_name
  INTO v_application
  FROM applications a
  LEFT JOIN candidate_profiles cp ON cp.id = a.candidate_id
  LEFT JOIN jobs j ON j.id = a.job_id
  LEFT JOIN companies c ON c.id = j.company_id
  WHERE a.id = NEW.application_id;
  
  -- Get recruiter employee profile with commission tier
  SELECT 
    ep.*,
    COALESCE(ct.percentage, ep.commission_percentage, 10) as effective_rate
  INTO v_recruiter_employee
  FROM employee_profiles ep
  LEFT JOIN commission_tiers ct ON ct.id = ep.commission_tier_id AND ct.is_active = true
  WHERE ep.user_id = COALESCE(NEW.created_by, v_application.sourced_by, v_application.user_id);
  
  IF v_recruiter_employee.id IS NOT NULL THEN
    v_commission_rate := v_recruiter_employee.effective_rate;
    v_commission_amount := NEW.fee_amount * (v_commission_rate / 100);
    
    -- Create recruiter commission (avoid duplicates)
    INSERT INTO employee_commissions (
      employee_id, 
      source_type, 
      source_id, 
      placement_fee_id,
      gross_amount, 
      commission_rate, 
      placement_fee_base,
      candidate_name, 
      company_name, 
      job_title, 
      commission_type,
      split_percentage,
      status, 
      period_date
    )
    SELECT
      v_recruiter_employee.id, 
      'placement_fee', 
      NEW.id, 
      NEW.id,
      v_commission_amount, 
      v_commission_rate, 
      NEW.fee_amount,
      v_application.candidate_name, 
      v_application.company_name, 
      v_application.job_title, 
      'placement',
      100,
      'pending', 
      CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1 FROM employee_commissions 
      WHERE placement_fee_id = NEW.id 
        AND employee_id = v_recruiter_employee.id 
        AND commission_type = 'placement'
    );
  END IF;
  
  -- Check for strategist assignment and create split commission
  SELECT 
    csa.*,
    ep.id as strategist_employee_id,
    COALESCE(ct.percentage, ep.commission_percentage, 10) as strategist_tier_rate
  INTO v_strategist_assignment
  FROM company_strategist_assignments csa
  JOIN employee_profiles ep ON ep.user_id = csa.strategist_id
  LEFT JOIN commission_tiers ct ON ct.id = ep.commission_tier_id AND ct.is_active = true
  WHERE csa.company_id = NEW.partner_company_id
    AND csa.is_active = true
    AND csa.strategist_id != COALESCE(NEW.created_by, v_application.sourced_by);
  
  IF v_strategist_assignment.strategist_employee_id IS NOT NULL THEN
    -- Strategist gets 20% of the base commission rate
    v_strategist_rate := v_strategist_assignment.strategist_tier_rate * 0.2;
    v_strategist_amount := NEW.fee_amount * (v_strategist_rate / 100);
    
    INSERT INTO employee_commissions (
      employee_id, 
      source_type, 
      source_id, 
      placement_fee_id,
      gross_amount, 
      commission_rate, 
      placement_fee_base,
      candidate_name, 
      company_name, 
      job_title, 
      commission_type,
      split_percentage, 
      status, 
      period_date
    )
    SELECT
      v_strategist_assignment.strategist_employee_id, 
      'placement_fee', 
      NEW.id, 
      NEW.id,
      v_strategist_amount, 
      v_strategist_rate, 
      NEW.fee_amount,
      v_application.candidate_name, 
      v_application.company_name, 
      v_application.job_title, 
      'strategist_split',
      20, 
      'pending', 
      CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1 FROM employee_commissions 
      WHERE placement_fee_id = NEW.id 
        AND employee_id = v_strategist_assignment.strategist_employee_id 
        AND commission_type = 'strategist_split'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create Commission Trigger on placement_fees
DROP TRIGGER IF EXISTS trg_calculate_commissions ON placement_fees;
CREATE TRIGGER trg_calculate_commissions
  AFTER INSERT ON placement_fees
  FOR EACH ROW
  EXECUTE FUNCTION calculate_commissions_on_placement_fee();
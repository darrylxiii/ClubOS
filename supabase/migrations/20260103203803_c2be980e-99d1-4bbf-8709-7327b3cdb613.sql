-- Fix the trigger to use companies.placement_fee_percentage as primary source
CREATE OR REPLACE FUNCTION auto_generate_placement_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_fee_percentage DECIMAL(5,2);
  v_fee_amount DECIMAL(12,2);
  v_salary DECIMAL(12,2);
  v_company_id UUID;
  v_splits JSONB;
BEGIN
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') THEN
    SELECT company_id INTO v_company_id FROM public.jobs WHERE id = NEW.job_id;
    
    -- Use companies.placement_fee_percentage first, then partner_billing_details, then default 20%
    SELECT COALESCE(
      c.placement_fee_percentage,
      pbd.default_fee_percentage,
      20.00
    ) INTO v_fee_percentage
    FROM public.companies c
    LEFT JOIN public.partner_billing_details pbd ON pbd.company_id = c.id
    WHERE c.id = v_company_id;
    
    SELECT COALESCE(current_salary_min, 75000.00) INTO v_salary
    FROM public.candidate_profiles WHERE id = NEW.candidate_id;
    
    v_fee_amount := v_salary * (v_fee_percentage / 100);
    
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'referrer_id', referrer_id,
      'split_percentage', split_percentage,
      'split_amount', ROUND(v_fee_amount * (split_percentage / 100), 2)
    )), '[]'::jsonb) INTO v_splits
    FROM public.company_referrer_splits
    WHERE company_id = v_company_id AND is_active = true;
    
    INSERT INTO public.placement_fees (
      application_id, candidate_id, partner_company_id, job_id, hired_date,
      candidate_salary, fee_percentage, fee_amount, fee_percentage_used,
      referrer_splits, status, payment_due_date
    ) VALUES (
      NEW.id, NEW.candidate_id, v_company_id, NEW.job_id, now(),
      v_salary, v_fee_percentage, v_fee_amount, v_fee_percentage,
      v_splits, 'pending', now() + interval '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
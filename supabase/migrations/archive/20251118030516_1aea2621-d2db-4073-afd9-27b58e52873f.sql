-- Fix security warnings: Add search_path to functions

-- Fix auto_generate_placement_fee function
CREATE OR REPLACE FUNCTION public.auto_generate_placement_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_fee_percentage DECIMAL(5,2);
  v_fee_amount DECIMAL(12,2);
  v_salary DECIMAL(12,2);
  v_company_id UUID;
  v_due_date TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') THEN
    
    SELECT company_id INTO v_company_id
    FROM public.jobs
    WHERE id = NEW.job_id;
    
    SELECT COALESCE(default_placement_fee_percentage, 15.00)
    INTO v_fee_percentage
    FROM public.financial_settings
    WHERE company_id = v_company_id
    LIMIT 1;
    
    IF v_fee_percentage IS NULL THEN
      v_fee_percentage := 15.00;
    END IF;
    
    SELECT COALESCE(
      (SELECT COALESCE(current_salary, expected_salary, 75000)
       FROM public.candidate_profiles
       WHERE id = NEW.candidate_id),
      75000
    ) INTO v_salary;
    
    v_fee_amount := (v_salary * v_fee_percentage / 100);
    v_due_date := NEW.updated_at + INTERVAL '30 days';
    
    INSERT INTO public.placement_fees (
      application_id,
      job_id,
      candidate_id,
      partner_company_id,
      fee_percentage,
      candidate_salary,
      fee_amount,
      status,
      hired_date,
      payment_due_date,
      created_by
    ) VALUES (
      NEW.id,
      NEW.job_id,
      NEW.candidate_id,
      v_company_id,
      v_fee_percentage,
      v_salary,
      v_fee_amount,
      'pending',
      NEW.updated_at,
      v_due_date,
      auth.uid()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_next_number INTEGER;
  v_year TEXT;
  v_invoice_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT 
    COALESCE(invoice_prefix, 'INV'),
    COALESCE(next_invoice_number, 1)
  INTO v_prefix, v_next_number
  FROM public.financial_settings
  WHERE company_id = p_company_id OR p_company_id IS NULL
  LIMIT 1;
  
  IF v_prefix IS NULL THEN
    v_prefix := 'INV';
    v_next_number := 1;
  END IF;
  
  v_invoice_number := v_prefix || '-' || v_year || '-' || LPAD(v_next_number::TEXT, 4, '0');
  
  UPDATE public.financial_settings
  SET next_invoice_number = next_invoice_number + 1,
      updated_at = now()
  WHERE company_id = p_company_id OR p_company_id IS NULL;
  
  IF NOT FOUND THEN
    INSERT INTO public.financial_settings (company_id, next_invoice_number)
    VALUES (p_company_id, 2)
    ON CONFLICT (company_id) DO UPDATE
    SET next_invoice_number = public.financial_settings.next_invoice_number + 1;
  END IF;
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix update_overdue_invoices function
CREATE OR REPLACE FUNCTION public.update_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE public.partner_invoices
  SET status = 'overdue',
      updated_at = now()
  WHERE status = 'sent'
  AND due_date < CURRENT_DATE
  AND paid_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;
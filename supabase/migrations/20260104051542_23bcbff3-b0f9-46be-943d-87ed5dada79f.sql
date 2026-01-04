-- Fix search_path for security
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := 'TQC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('contract_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION capture_investor_metrics_snapshot(p_snapshot_type TEXT DEFAULT 'daily')
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id UUID;
  v_arr NUMERIC;
  v_mrr NUMERIC;
  v_revenue_ytd NUMERIC;
  v_total_customers INTEGER;
  v_active_customers INTEGER;
  v_total_users INTEGER;
  v_total_candidates INTEGER;
  v_total_applications INTEGER;
  v_total_placements INTEGER;
  v_pipeline_value NUMERIC;
  v_weighted_pipeline NUMERIC;
  v_deal_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(annual_value), 0) INTO v_arr
  FROM public.enterprise_contracts WHERE status = 'active';
  v_mrr := v_arr / 12;
  
  SELECT COALESCE(SUM(total_amount), 0) INTO v_revenue_ytd
  FROM public.moneybird_sales_invoices
  WHERE state_normalized = 'paid' AND EXTRACT(YEAR FROM invoice_date::date) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT COUNT(*) INTO v_total_customers FROM public.companies WHERE is_partner = true;
  SELECT COUNT(DISTINCT partner_company_id) INTO v_active_customers 
  FROM public.placement_fees WHERE created_at > NOW() - INTERVAL '12 months';
  
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_total_candidates FROM public.candidate_profiles;
  SELECT COUNT(*) INTO v_total_applications FROM public.applications;
  SELECT COUNT(*) INTO v_total_placements FROM public.applications WHERE status = 'hired';
  
  SELECT COALESCE(SUM(fee_amount), 0), COALESCE(SUM(fee_amount * 0.3), 0), COUNT(*)
  INTO v_pipeline_value, v_weighted_pipeline, v_deal_count
  FROM public.placement_fees WHERE status IN ('pending', 'invoiced');
  
  INSERT INTO public.investor_metrics_snapshots (
    snapshot_date, snapshot_type, arr, mrr, revenue_ytd,
    total_customers, active_customers, total_users, total_candidates, 
    total_applications, total_placements, placement_rate,
    pipeline_value, weighted_pipeline, deal_count, avg_deal_size
  ) VALUES (
    CURRENT_DATE, p_snapshot_type, v_arr, v_mrr, v_revenue_ytd,
    v_total_customers, v_active_customers, v_total_users, v_total_candidates, 
    v_total_applications, v_total_placements,
    CASE WHEN v_total_applications > 0 THEN v_total_placements::NUMERIC / v_total_applications ELSE 0 END,
    v_pipeline_value, v_weighted_pipeline, v_deal_count,
    CASE WHEN v_deal_count > 0 THEN v_pipeline_value / v_deal_count ELSE 0 END
  )
  ON CONFLICT (snapshot_date, snapshot_type) DO UPDATE SET
    arr = EXCLUDED.arr, mrr = EXCLUDED.mrr, revenue_ytd = EXCLUDED.revenue_ytd,
    total_customers = EXCLUDED.total_customers, active_customers = EXCLUDED.active_customers,
    total_users = EXCLUDED.total_users, total_candidates = EXCLUDED.total_candidates,
    total_applications = EXCLUDED.total_applications, total_placements = EXCLUDED.total_placements,
    placement_rate = EXCLUDED.placement_rate, pipeline_value = EXCLUDED.pipeline_value,
    weighted_pipeline = EXCLUDED.weighted_pipeline, deal_count = EXCLUDED.deal_count, avg_deal_size = EXCLUDED.avg_deal_size
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;
-- Fix capture_investor_metrics_snapshot to use NET revenue instead of GROSS
CREATE OR REPLACE FUNCTION capture_investor_metrics_snapshot(p_snapshot_type TEXT DEFAULT 'daily')
RETURNS UUID AS $$
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
  v_months_elapsed INTEGER;
BEGIN
  -- Months elapsed this year for annualization
  v_months_elapsed := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  IF v_months_elapsed < 1 THEN v_months_elapsed := 1; END IF;

  -- YTD NET revenue (prefer net_amount, fallback to total_amount / 1.21)
  SELECT COALESCE(SUM(
    CASE 
      WHEN net_amount IS NOT NULL AND net_amount > 0 THEN net_amount
      ELSE total_amount / 1.21
    END
  ), 0) INTO v_revenue_ytd
  FROM public.moneybird_sales_invoices
  WHERE EXTRACT(YEAR FROM invoice_date::date) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- ARR = annualized from YTD net revenue
  v_arr := (v_revenue_ytd / v_months_elapsed) * 12;
  v_mrr := v_arr / 12;
  
  -- Customer counts
  SELECT COUNT(DISTINCT contact_id) INTO v_total_customers 
  FROM public.moneybird_sales_invoices
  WHERE EXTRACT(YEAR FROM invoice_date::date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND contact_id IS NOT NULL;

  SELECT COUNT(DISTINCT contact_id) INTO v_active_customers 
  FROM public.moneybird_sales_invoices
  WHERE invoice_date::date > CURRENT_DATE - INTERVAL '12 months'
    AND contact_id IS NOT NULL;
  
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_total_candidates FROM public.candidate_profiles;
  SELECT COUNT(*) INTO v_total_applications FROM public.applications;
  SELECT COUNT(*) INTO v_total_placements FROM public.applications WHERE status = 'hired';
  
  -- Pipeline from pending/invoiced placement fees
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

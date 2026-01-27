-- Add remaining tables to realtime publication (if not already added)
DO $$
BEGIN
  -- Try to add partner_sla_tracking
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_sla_tracking;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'partner_sla_tracking already in publication';
  END;
  
  -- Try to add partner_health_scores
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_health_scores;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'partner_health_scores already in publication';
  END;
  
  -- Try to add placement_fees
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.placement_fees;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'placement_fees already in publication';
  END;
END $$;
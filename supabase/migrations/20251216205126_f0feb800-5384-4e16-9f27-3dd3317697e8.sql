-- Fix: Add remaining realtime tables (skip already added ones)
DO $$
BEGIN
  -- Try to add tables to realtime, ignore if already exists
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_relationship_scores;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cross_channel_patterns;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
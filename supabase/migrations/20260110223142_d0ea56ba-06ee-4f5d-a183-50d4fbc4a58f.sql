-- Add missing columns to success_patterns table
ALTER TABLE public.success_patterns 
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pattern_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS context_entity_type TEXT;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_success_patterns_type ON public.success_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_success_patterns_active ON public.success_patterns(is_active) WHERE is_active = true;

-- Ensure RLS is enabled
ALTER TABLE public.success_patterns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate with proper access control
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "success_patterns_select_admin_strategist" ON public.success_patterns;
  DROP POLICY IF EXISTS "success_patterns_insert_service" ON public.success_patterns;
  DROP POLICY IF EXISTS "success_patterns_update_service" ON public.success_patterns;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "success_patterns_select_admin_strategist" ON public.success_patterns
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
  );

CREATE POLICY "success_patterns_insert_service" ON public.success_patterns
  FOR INSERT WITH CHECK (true);

CREATE POLICY "success_patterns_update_service" ON public.success_patterns
  FOR UPDATE USING (true);

-- Add search_path security to sync function if exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_to_unified_communications') THEN
    ALTER FUNCTION public.sync_to_unified_communications() SET search_path = public;
  END IF;
END $$;

-- Add realtime for success_patterns (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.success_patterns;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
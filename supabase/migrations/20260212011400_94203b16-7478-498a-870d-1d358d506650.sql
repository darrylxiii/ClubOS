
-- Add new columns to edge_function_registry
ALTER TABLE public.edge_function_registry 
  ADD COLUMN IF NOT EXISTS polling_interval_ms integer,
  ADD COLUMN IF NOT EXISTS admin_disabled_at timestamptz;

-- Create edge_function_daily_stats table
CREATE TABLE IF NOT EXISTS public.edge_function_daily_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  date date NOT NULL,
  invocation_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  avg_response_time_ms numeric DEFAULT 0,
  total_tokens_used integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(function_name, date)
);

-- Enable RLS
ALTER TABLE public.edge_function_daily_stats ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for daily stats
CREATE POLICY "Admins can read edge function daily stats"
  ON public.edge_function_daily_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage edge function daily stats"
  ON public.edge_function_daily_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Service role full access (for edge function aggregation)
CREATE POLICY "Service role full access on edge_function_daily_stats"
  ON public.edge_function_daily_stats FOR ALL
  USING (auth.role() = 'service_role');

-- Admin update policy for edge_function_registry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'edge_function_registry' AND policyname = 'Admins can update edge function registry'
  ) THEN
    CREATE POLICY "Admins can update edge function registry"
      ON public.edge_function_registry FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = auth.uid() 
          AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

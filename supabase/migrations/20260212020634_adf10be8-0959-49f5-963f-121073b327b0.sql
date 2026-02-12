-- Add smart sampling, throttling, and cost estimation fields to edge_function_registry
ALTER TABLE public.edge_function_registry 
  ADD COLUMN IF NOT EXISTS sampling_rate numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS min_call_interval_ms integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_api_cost_per_call numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compute_cost_estimate_per_call numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS require_auth boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS batchable boolean DEFAULT false;

-- Add cost columns to edge_function_daily_stats
ALTER TABLE public.edge_function_daily_stats
  ADD COLUMN IF NOT EXISTS external_api_cost_daily numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compute_cost_daily numeric DEFAULT 0;
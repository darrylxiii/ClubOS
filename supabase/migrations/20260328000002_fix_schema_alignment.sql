-- ════════════════════════════════════════════════════════════
-- Schema Alignment Fix: Round 3
-- Aligns column names and types between frontend code and DB schema
-- ════════════════════════════════════════════════════════════

-- 1a. application_stage_history: code queries transitioned_at, schema has created_at
ALTER TABLE public.application_stage_history
  ADD COLUMN IF NOT EXISTS transitioned_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_stage_history_transitioned
  ON public.application_stage_history(transitioned_at);

-- 1b. recruiter_activity_log: code queries created_at, schema has recorded_at
ALTER TABLE public.recruiter_activity_log
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 1c. email_tracking_events: code queries created_at, schema has recorded_at
ALTER TABLE public.email_tracking_events
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 1d. headcount_plans: code uses year/planned_headcount/actual_headcount/budget/notes
--     schema uses fiscal_year/total_headcount_planned/total_headcount_actual/budget_planned
ALTER TABLE public.headcount_plans
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS planned_headcount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_headcount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill alias columns from canonical columns
UPDATE public.headcount_plans SET
  year = fiscal_year,
  planned_headcount = total_headcount_planned,
  actual_headcount = total_headcount_actual,
  budget = budget_planned
WHERE year IS NULL AND fiscal_year IS NOT NULL;

-- 1e. requisitions: code uses budget_allocated, schema has salary_range columns only
ALTER TABLE public.requisitions
  ADD COLUMN IF NOT EXISTS budget_allocated NUMERIC(12,2) DEFAULT 0;

-- 1f. api_keys: code uses permissions as TEXT[], rate_limit, created_by, usage_count
--     schema has permissions as TEXT (single), rate_limit_per_minute, user_id, no usage_count
DO $$ BEGIN
  -- Drop the restrictive single-value CHECK constraint
  ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_permissions_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Convert permissions from TEXT to TEXT[] to support multi-permission arrays
DO $$ BEGIN
  ALTER TABLE public.api_keys
    ALTER COLUMN permissions TYPE TEXT[] USING ARRAY[permissions];
EXCEPTION WHEN others THEN NULL; -- Already TEXT[] or column doesn't exist
END $$;

ALTER TABLE public.api_keys ALTER COLUMN permissions SET DEFAULT '{}';

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS rate_limit INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

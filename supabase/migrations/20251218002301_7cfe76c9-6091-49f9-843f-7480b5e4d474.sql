-- Asset events table for tracking lifecycle changes
CREATE TABLE IF NOT EXISTS public.inventory_asset_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.inventory_assets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  previous_value JSONB,
  new_value JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Depreciation runs history table
CREATE TABLE IF NOT EXISTS public.inventory_depreciation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  total_entries INTEGER NOT NULL DEFAULT 0,
  total_depreciation NUMERIC(15,2) NOT NULL DEFAULT 0,
  run_type TEXT NOT NULL DEFAULT 'generate',
  run_by UUID,
  run_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(period_year, period_month, run_at)
);

-- Add new status values to enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'under_maintenance' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'inventory_asset_status')) THEN
    ALTER TYPE public.inventory_asset_status ADD VALUE IF NOT EXISTS 'under_maintenance';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'disposed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'inventory_asset_status')) THEN
    ALTER TYPE public.inventory_asset_status ADD VALUE IF NOT EXISTS 'disposed';
  END IF;
END $$;

-- Add disposal fields to inventory_assets
ALTER TABLE public.inventory_assets 
ADD COLUMN IF NOT EXISTS disposed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS disposal_reason TEXT,
ADD COLUMN IF NOT EXISTS disposal_value NUMERIC(15,2);

-- Enable RLS
ALTER TABLE public.inventory_asset_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_depreciation_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies using user_roles table
CREATE POLICY "Admin can manage asset events" ON public.inventory_asset_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin')
  );

CREATE POLICY "Admin can manage depreciation runs" ON public.inventory_depreciation_runs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_events_asset_id ON public.inventory_asset_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_events_created_at ON public.inventory_asset_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_depreciation_runs_period ON public.inventory_depreciation_runs(period_year, period_month);
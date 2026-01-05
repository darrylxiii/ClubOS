-- Create company_assets table for Inventory Dashboard
CREATE TABLE public.company_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_number TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'equipment',
  asset_type TEXT DEFAULT 'tangible',
  purchase_date DATE NOT NULL,
  total_purchase_value DECIMAL(12,2) DEFAULT 0,
  accumulated_depreciation DECIMAL(12,2) DEFAULT 0,
  current_book_value DECIMAL(12,2) DEFAULT 0,
  depreciation_rate DECIMAL(5,2) DEFAULT 0.20,
  useful_life_years INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active',
  kia_eligible BOOLEAN DEFAULT false,
  location TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_assets ENABLE ROW LEVEL SECURITY;

-- Admin can do everything (using user_roles table)
CREATE POLICY "Admins can manage company assets"
ON public.company_assets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- Create indexes for faster queries
CREATE INDEX idx_company_assets_status ON public.company_assets(status);
CREATE INDEX idx_company_assets_category ON public.company_assets(category);
CREATE INDEX idx_company_assets_asset_type ON public.company_assets(asset_type);

-- Add trigger for updated_at
CREATE TRIGGER update_company_assets_updated_at
  BEFORE UPDATE ON public.company_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default feature flags
INSERT INTO public.feature_flags (flag_key, name, description, enabled, created_by)
SELECT 
  flag_key, name, description, enabled, NULL
FROM (VALUES
  ('club_pilot_enabled', 'Club Pilot', 'Enable AI-powered task scheduling and prioritization', true),
  ('ai_matching_enabled', 'AI Matching', 'Enable AI-powered candidate-role matching', true),
  ('ghost_mode_enabled', 'Ghost Mode', 'Allow candidates to browse anonymously', false),
  ('drops_engine_enabled', 'Drops Engine', 'Enable exclusive opportunity drops', false),
  ('dossier_sharing_v2', 'Dossier Sharing V2', 'Use new dossier sharing interface', true),
  ('quin_voice_enabled', 'QUIN Voice', 'Enable voice interactions with QUIN AI', false)
) AS t(flag_key, name, description, enabled)
WHERE NOT EXISTS (SELECT 1 FROM public.feature_flags WHERE feature_flags.flag_key = t.flag_key);

-- Create audit event trigger function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_events (
    event_type,
    entity_type,
    entity_id,
    user_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add audit trigger to feature_flags for tracking changes
DROP TRIGGER IF EXISTS audit_feature_flags_changes ON public.feature_flags;
CREATE TRIGGER audit_feature_flags_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
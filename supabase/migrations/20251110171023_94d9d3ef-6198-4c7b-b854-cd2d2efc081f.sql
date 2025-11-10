-- Create system settings table for feature flags
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert auto_merge setting (default: OFF)
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'auto_merge_enabled',
  'false'::jsonb,
  'Enable automatic merging of candidate profiles during signup when email matches'
)
ON CONFLICT (setting_key) DO NOTHING;

-- RLS policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read all settings
CREATE POLICY "Admins can read system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can update settings
CREATE POLICY "Admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
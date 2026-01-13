-- Create company_settings table for storing company-wide and role-specific configurations
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pipeline_settings JSONB DEFAULT '{
    "default_stages": [
      {"name": "Applied", "order": 0},
      {"name": "Screening", "order": 1},
      {"name": "Interview", "order": 2},
      {"name": "Final Review", "order": 3},
      {"name": "Offer", "order": 4}
    ],
    "auto_advance_rules": {},
    "sla_hours_per_stage": {
      "Applied": 24,
      "Screening": 48,
      "Interview": 72,
      "Final Review": 48,
      "Offer": 24
    },
    "notification_preferences": {
      "notify_on_apply": true,
      "notify_on_stage_change": true,
      "notify_on_rejection": true
    }
  }'::JSONB,
  role_settings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Company members can view their company settings
CREATE POLICY "Company members can view settings"
  ON public.company_settings
  FOR SELECT
  USING (
    is_company_member(auth.uid(), company_id) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Company admins and owners can update settings
CREATE POLICY "Company admins can update settings"
  ON public.company_settings
  FOR ALL
  USING (
    has_company_role(auth.uid(), company_id, 'owner')
    OR has_company_role(auth.uid(), company_id, 'admin')
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Create index for faster lookups
CREATE INDEX idx_company_settings_company_id ON public.company_settings(company_id);
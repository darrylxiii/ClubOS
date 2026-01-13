-- Create biometric_settings table for storing user biometric preferences
CREATE TABLE IF NOT EXISTS public.biometric_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biometric_enabled BOOLEAN DEFAULT false,
  auto_lock_timeout_minutes INTEGER DEFAULT 5,
  last_biometric_auth TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.biometric_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own biometric settings
CREATE POLICY "Users can view their own biometric settings"
ON public.biometric_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biometric settings"
ON public.biometric_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biometric settings"
ON public.biometric_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_biometric_settings_updated_at
  BEFORE UPDATE ON public.biometric_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
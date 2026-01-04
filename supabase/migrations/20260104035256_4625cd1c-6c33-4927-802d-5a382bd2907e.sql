-- Create platform_settings table for configurable values
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage settings" ON public.platform_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can read settings" ON public.platform_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert default values
INSERT INTO public.platform_settings (key, value, description) VALUES
('estimated_placement_fee', '15000', 'Average placement fee in EUR for revenue calculations'),
('pipeline_conversion_rate', '0.3', 'Expected conversion rate for pipeline value calculations'),
('currency', '"EUR"', 'Default currency for the platform');

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create cities table for location management
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(name, country)
);

-- Add preferred work locations to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_work_locations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS remote_work_preference BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Insert popular tech hub cities
INSERT INTO public.cities (name, country, region) VALUES
  ('San Francisco', 'United States', 'California'),
  ('New York', 'United States', 'New York'),
  ('Seattle', 'United States', 'Washington'),
  ('Austin', 'United States', 'Texas'),
  ('Boston', 'United States', 'Massachusetts'),
  ('Los Angeles', 'United States', 'California'),
  ('Chicago', 'United States', 'Illinois'),
  ('London', 'United Kingdom', 'England'),
  ('Berlin', 'Germany', 'Berlin'),
  ('Amsterdam', 'Netherlands', 'North Holland'),
  ('Paris', 'France', 'Île-de-France'),
  ('Barcelona', 'Spain', 'Catalonia'),
  ('Singapore', 'Singapore', 'Singapore'),
  ('Hong Kong', 'Hong Kong', 'Hong Kong'),
  ('Tokyo', 'Japan', 'Tokyo'),
  ('Sydney', 'Australia', 'New South Wales'),
  ('Toronto', 'Canada', 'Ontario'),
  ('Vancouver', 'Canada', 'British Columbia'),
  ('Dubai', 'United Arab Emirates', 'Dubai'),
  ('Tel Aviv', 'Israel', 'Tel Aviv'),
  ('Bangalore', 'India', 'Karnataka'),
  ('Mumbai', 'India', 'Maharashtra'),
  ('Stockholm', 'Sweden', 'Stockholm'),
  ('Copenhagen', 'Denmark', 'Capital Region'),
  ('Zurich', 'Switzerland', 'Zurich');

-- Enable RLS on cities table
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read cities
CREATE POLICY "Authenticated users can view cities"
ON public.cities
FOR SELECT
TO authenticated
USING (is_active = true);

-- Only admins can manage cities
CREATE POLICY "Admins can manage cities"
ON public.cities
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
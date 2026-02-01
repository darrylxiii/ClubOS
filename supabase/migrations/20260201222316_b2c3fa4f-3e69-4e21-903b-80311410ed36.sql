-- Create job_locations table for multi-location support
CREATE TABLE public.job_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL DEFAULT 'onsite' CHECK (location_type IN ('onsite', 'remote', 'hybrid')),
  city TEXT,
  country TEXT,
  country_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  formatted_address TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add is_remote column to jobs table for quick filtering
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false;

-- Create index for fast lookups
CREATE INDEX idx_job_locations_job_id ON public.job_locations(job_id);
CREATE INDEX idx_jobs_is_remote ON public.jobs(is_remote);

-- Enable RLS
ALTER TABLE public.job_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read job locations (jobs are public)
CREATE POLICY "Anyone can read job locations"
  ON public.job_locations FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert job locations
CREATE POLICY "Authenticated users can insert job locations"
  ON public.job_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update their job locations
CREATE POLICY "Authenticated users can update job locations"
  ON public.job_locations FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete job locations
CREATE POLICY "Authenticated users can delete job locations"
  ON public.job_locations FOR DELETE
  TO authenticated
  USING (true);

-- Migrate existing location data to job_locations table
INSERT INTO public.job_locations (job_id, location_type, city, country_code, latitude, longitude, formatted_address, is_primary)
SELECT 
  id,
  'onsite',
  location_city,
  location_country_code,
  latitude,
  longitude,
  location_formatted,
  true
FROM public.jobs
WHERE location_city IS NOT NULL OR location_country_code IS NOT NULL
ON CONFLICT DO NOTHING;
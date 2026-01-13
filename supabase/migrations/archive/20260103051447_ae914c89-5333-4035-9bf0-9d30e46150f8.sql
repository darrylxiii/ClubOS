-- Add geocoordinates to jobs table
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS location_formatted TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_country_code TEXT;

-- Add geocoordinates to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS headquarters_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS headquarters_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS headquarters_city TEXT,
  ADD COLUMN IF NOT EXISTS headquarters_country_code TEXT;

-- Create spatial indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_jobs_geo ON jobs(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_location_city ON jobs(location_city) WHERE location_city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_geo ON companies(headquarters_latitude, headquarters_longitude) WHERE headquarters_latitude IS NOT NULL;
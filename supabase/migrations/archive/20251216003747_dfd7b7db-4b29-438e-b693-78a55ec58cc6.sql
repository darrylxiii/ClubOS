-- Create brand assets cache table
CREATE TABLE IF NOT EXISTS public.brand_assets_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  icon_url TEXT,
  brand_name TEXT,
  primary_color TEXT,
  colors JSONB,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for domain lookups
CREATE INDEX IF NOT EXISTS idx_brand_assets_cache_domain ON public.brand_assets_cache(domain);

-- Create index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_brand_assets_cache_expires ON public.brand_assets_cache(expires_at);

-- Enable RLS
ALTER TABLE public.brand_assets_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached assets
CREATE POLICY "Anyone can read brand assets cache"
ON public.brand_assets_cache
FOR SELECT
USING (true);

-- Only service role can insert/update (edge function uses service role)
CREATE POLICY "Service role can manage brand assets cache"
ON public.brand_assets_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_brand_assets_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_brand_assets_cache_updated_at ON public.brand_assets_cache;
CREATE TRIGGER update_brand_assets_cache_updated_at
  BEFORE UPDATE ON public.brand_assets_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_brand_assets_cache_updated_at();
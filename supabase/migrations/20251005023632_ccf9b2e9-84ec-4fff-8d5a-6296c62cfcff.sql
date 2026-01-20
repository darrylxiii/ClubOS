-- Create a public-safe view for talent strategists that excludes PII
-- This view only exposes non-sensitive information suitable for public display
CREATE OR REPLACE VIEW public.public_talent_strategists AS
SELECT 
  ts.id,
  ts.full_name,
  ts.title,
  ts.bio,
  ts.photo_url,
  ts.specialties,
  ts.availability,
  ts.linkedin_url,
  ts.twitter_url,
  ts.instagram_url
FROM public.talent_strategists ts;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.public_talent_strategists TO authenticated;

-- Note: This view does NOT expose PII:
-- - email (excluded)
-- - phone (excluded)
-- - created_at/updated_at (excluded)
-- Users can safely query this view to see strategist profiles
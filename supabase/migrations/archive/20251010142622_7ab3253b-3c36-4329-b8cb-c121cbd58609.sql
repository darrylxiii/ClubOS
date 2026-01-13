-- Add profile_slug column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_slug TEXT;

-- Create unique index on profile_slug
CREATE UNIQUE INDEX IF NOT EXISTS profiles_profile_slug_unique ON profiles(profile_slug) WHERE profile_slug IS NOT NULL;

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_profile_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert name to lowercase, replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'user';
  END IF;
  
  final_slug := base_slug;
  
  -- Check if slug exists, if so add counter
  WHILE EXISTS (SELECT 1 FROM profiles WHERE profile_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Update existing profiles to have slugs based on their names
UPDATE profiles
SET profile_slug = generate_profile_slug(full_name)
WHERE profile_slug IS NULL AND full_name IS NOT NULL;

-- Add check constraint for slug format
ALTER TABLE profiles ADD CONSTRAINT profile_slug_format CHECK (profile_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
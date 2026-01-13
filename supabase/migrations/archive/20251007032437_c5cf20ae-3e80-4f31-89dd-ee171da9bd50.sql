-- Fix security vulnerability: Remove public access to talent_strategists table
-- The public_talent_strategists view already exists and provides safe public access

-- Drop the dangerous policy that allows public SELECT on all data
DROP POLICY IF EXISTS "Public can view basic strategist info" ON public.talent_strategists;

-- The existing admin-only policies remain intact:
-- - "Only admins can view talent strategists" (SELECT with has_role check)
-- - "Only admins can insert talent strategists" (INSERT with has_role check)
-- - "Only admins can update talent strategists" (UPDATE with has_role check)
-- - "Only admins can delete talent strategists" (DELETE with has_role check)

-- The public_talent_strategists view is already configured and will continue to work
-- It exposes only: id, full_name, title, bio, photo_url, specialties, availability, created_at, updated_at
-- It does NOT expose: email, phone, linkedin_url, twitter_url, instagram_url
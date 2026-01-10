-- Fix Security Definer Views by recreating them as SECURITY INVOKER
-- This ensures RLS policies of the querying user are enforced

-- Drop and recreate public_profiles view
DROP VIEW IF EXISTS public.public_profiles CASCADE;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
    id,
    full_name,
    avatar_url,
    profile_slug,
    created_at
FROM profiles;

-- Drop and recreate public_companies view  
DROP VIEW IF EXISTS public.public_companies CASCADE;
CREATE VIEW public.public_companies
WITH (security_invoker = true)
AS
SELECT 
    id,
    name,
    slug,
    tagline,
    description,
    logo_url,
    cover_image_url,
    website_url,
    linkedin_url,
    twitter_url,
    instagram_url,
    industry,
    company_size,
    founded_year,
    headquarters_location,
    mission,
    vision,
    "values",
    culture_highlights,
    benefits,
    tech_stack,
    careers_email,
    careers_page_url,
    is_active,
    member_since,
    membership_tier,
    meta_title,
    meta_description,
    created_at,
    updated_at
FROM companies
WHERE is_active = true;

-- Drop and recreate potential_merges view
DROP VIEW IF EXISTS public.potential_merges CASCADE;
CREATE VIEW public.potential_merges
WITH (security_invoker = true)
AS
SELECT 
    cp.id AS candidate_id,
    cp.full_name AS candidate_name,
    cp.email AS candidate_email,
    cp.user_id AS linked_user_id,
    cp.invitation_status,
    cp.profile_completeness AS candidate_completeness,
    cp.created_at AS candidate_created_at,
    p.id AS profile_id,
    p.full_name AS profile_name,
    p.email AS profile_email,
    p.created_at AS profile_created_at,
    CASE
        WHEN ((cp.user_id IS NOT NULL) AND (cp.invitation_status <> 'registered'::text)) THEN 'partial_link'::text
        WHEN ((lower(cp.email) = lower(p.email)) AND (cp.user_id IS NULL)) THEN 'email_match'::text
        WHEN (calculate_name_similarity(cp.full_name, p.full_name) >= 95) THEN 'name_match'::text
        ELSE 'manual'::text
    END AS match_type,
    CASE
        WHEN ((cp.user_id = p.id) AND (cp.invitation_status <> 'registered'::text)) THEN 95
        WHEN (lower(cp.email) = lower(p.email)) THEN 90
        WHEN (calculate_name_similarity(cp.full_name, p.full_name) = 100) THEN 85
        WHEN (calculate_name_similarity(cp.full_name, p.full_name) >= 95) THEN 75
        ELSE 50
    END AS confidence_score,
    (EXISTS ( SELECT 1
           FROM candidate_merge_log
          WHERE ((candidate_merge_log.candidate_id = cp.id) AND (candidate_merge_log.profile_id = p.id) AND (candidate_merge_log.merge_status = 'completed'::text)))) AS already_merged
FROM (candidate_profiles cp
     JOIN profiles p ON (((lower(cp.email) = lower(p.email)) OR (cp.user_id = p.id) OR (calculate_name_similarity(cp.full_name, p.full_name) >= 95))))
WHERE (((cp.invitation_status IS NULL) OR (cp.invitation_status <> 'registered'::text)) AND (cp.merged_at IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM candidate_merge_log
          WHERE ((candidate_merge_log.candidate_id = cp.id) AND (candidate_merge_log.profile_id = p.id) AND (candidate_merge_log.merge_status = 'completed'::text))))));
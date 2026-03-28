-- MERGE DUPLICATE PROFILES: Users who had an old migrated profile under one email
-- and signed up with a different email, creating a new empty profile.
-- Strategy: Copy all substantive data + roles from old profile to new profile,
-- then mark old profile as merged.

-- 1. Fix Sebastiaan: merge old profile data into new auth-linked profile
UPDATE profiles SET
  full_name = 'Sebastiaan brouwer',
  account_status = 'approved',
  onboarding_completed_at = '2025-11-11 20:36:07.831+00',
  phone = '+31623859988',
  current_title = 'Talent Strategist',
  updated_at = now()
WHERE id = '9bec7c85-6d76-4320-8c46-669fdb51701a';

-- Copy missing roles from old profile to new
INSERT INTO user_roles (user_id, role)
SELECT '9bec7c85-6d76-4320-8c46-669fdb51701a', role
FROM user_roles 
WHERE user_id = 'f1f446e1-b186-4a35-9daf-cc0bcd10b907'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Create a reusable merge function for future use
CREATE OR REPLACE FUNCTION public.merge_migrated_profile(
  p_old_profile_id UUID,
  p_new_profile_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_old FROM profiles WHERE id = p_old_profile_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Old profile not found: %', p_old_profile_id;
  END IF;

  UPDATE profiles SET
    full_name = COALESCE(NULLIF(profiles.full_name, SPLIT_PART(profiles.email, '@', 1)), v_old.full_name, profiles.full_name),
    account_status = CASE WHEN v_old.account_status = 'approved' THEN 'approved' ELSE profiles.account_status END,
    onboarding_completed_at = COALESCE(profiles.onboarding_completed_at, v_old.onboarding_completed_at),
    phone = COALESCE(profiles.phone, v_old.phone),
    current_title = COALESCE(profiles.current_title, v_old.current_title),
    avatar_url = COALESCE(profiles.avatar_url, v_old.avatar_url),
    linkedin_url = COALESCE(profiles.linkedin_url, v_old.linkedin_url),
    location = COALESCE(profiles.location, v_old.location),
    bio = COALESCE(profiles.bio, v_old.bio),
    company_id = COALESCE(profiles.company_id, v_old.company_id),
    employment_type_preference = COALESCE(profiles.employment_type_preference, v_old.employment_type_preference),
    notice_period = COALESCE(profiles.notice_period, v_old.notice_period),
    remote_work_preference = COALESCE(profiles.remote_work_preference, v_old.remote_work_preference),
    resume_url = COALESCE(profiles.resume_url, v_old.resume_url),
    resume_filename = COALESCE(profiles.resume_filename, v_old.resume_filename),
    updated_at = now()
  WHERE id = p_new_profile_id;

  INSERT INTO user_roles (user_id, role)
  SELECT p_new_profile_id, role
  FROM user_roles 
  WHERE user_id = p_old_profile_id
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE profiles SET 
    account_status = 'approved',
    bio = COALESCE(bio, '') || E'\n[MERGED to ' || p_new_profile_id || ' on ' || now()::text || ']'
  WHERE id = p_old_profile_id;
END;
$$;

-- 3. Enhanced handle_new_user with auto-merge capability
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_profile_id UUID;
  v_existing_status TEXT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name, SPLIT_PART(EXCLUDED.email, '@', 1)),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF (NEW.email ILIKE '%@thequantumclub.nl') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- AUTO-MERGE: Check if there's an existing approved profile with matching name
  SELECT id, account_status INTO v_existing_profile_id, v_existing_status
  FROM profiles
  WHERE id != NEW.id
    AND account_status = 'approved'
    AND onboarding_completed_at IS NOT NULL
    AND (phone IS NOT NULL OR current_title IS NOT NULL)
    AND LOWER(SPLIT_PART(full_name, ' ', 1)) = LOWER(SPLIT_PART(
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)), ' ', 1
    ))
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_existing_profile_id IS NOT NULL THEN
    PERFORM merge_migrated_profile(v_existing_profile_id, NEW.id);
  END IF;

  UPDATE public.candidate_profiles
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$;

-- FIX: "Database error saving new user" caused by trg_auto_promote_quantum_admins
-- PROBLEM: The BEFORE INSERT trigger tries to INSERT into user_roles before
-- the auth.users row is committed, violating the FK constraint.
-- SOLUTION: 
--   1. Remove the user_roles INSERT from the BEFORE trigger (keep JWT claim only)
--   2. Move the role INSERT into handle_new_user() which fires AFTER INSERT

-- Step 1: Fix the BEFORE trigger to ONLY modify JWT claims (no FK-dependent writes)
CREATE OR REPLACE FUNCTION public.auto_promote_quantum_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user registers with the corporate domain, set admin in JWT claims
  IF (NEW.email ILIKE '%@thequantumclub.nl') THEN
    NEW.raw_app_meta_data := coalesce(NEW.raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 2: Update handle_new_user to also assign default 'user' role 
-- AND handle admin auto-promotion for @thequantumclub.nl emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create or update profile
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

  -- Assign default 'user' role (safe: auth.users row now exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Auto-promote @thequantumclub.nl to admin role
  IF (NEW.email ILIKE '%@thequantumclub.nl') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Auto-link orphan candidate_profiles by email
  UPDATE public.candidate_profiles
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$;

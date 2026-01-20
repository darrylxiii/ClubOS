-- Step 1: Fix Sebastiaan's profile data to match auth.users
UPDATE profiles 
SET 
  email = (SELECT email FROM auth.users WHERE id = profiles.id),
  full_name = COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = profiles.id),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = profiles.id),
    full_name
  ),
  updated_at = now()
WHERE id = 'f1f446e1-b186-4a35-9daf-cc0bcd10b907';

-- Step 2: Create function to detect data integrity issues
CREATE OR REPLACE FUNCTION public.check_profile_auth_integrity()
RETURNS TABLE(
  user_id uuid,
  auth_email text,
  profile_email text,
  auth_full_name text,
  profile_full_name text,
  mismatch_type text
) 
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    au.email,
    p.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''),
    COALESCE(p.full_name, ''),
    CASE 
      WHEN au.email != p.email THEN 'EMAIL_MISMATCH'
      WHEN COALESCE(p.full_name, '') = '' THEN 'EMPTY_NAME'
      ELSE 'UNKNOWN'
    END
  FROM profiles p
  INNER JOIN auth.users au ON p.id = au.id
  WHERE 
    au.email != p.email 
    OR COALESCE(p.full_name, '') = '';
END;
$$;

-- Step 3: Create function to automatically fix mismatches
CREATE OR REPLACE FUNCTION public.fix_profile_auth_mismatches()
RETURNS TABLE(
  user_id uuid,
  fixed_email text,
  fixed_name text,
  fix_type text
)
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update profiles to match auth.users
  UPDATE profiles p
  SET 
    email = au.email,
    full_name = COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      p.full_name,
      'Unknown User'
    ),
    updated_at = now()
  FROM auth.users au
  WHERE p.id = au.id
    AND (au.email != p.email OR COALESCE(p.full_name, '') = '');
    
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    CASE 
      WHEN OLD.email != p.email THEN 'EMAIL_FIXED'
      WHEN OLD.full_name IS NULL OR OLD.full_name = '' THEN 'NAME_FIXED'
      ELSE 'UPDATED'
    END as fix_type
  FROM profiles p
  INNER JOIN auth.users au ON p.id = au.id
  WHERE p.updated_at >= now() - interval '1 second';
END;
$$;

-- Step 4: Strengthen handle_new_user trigger to prevent future mismatches
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_full_name text;
BEGIN
  -- Get full name with multiple fallbacks
  user_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'Unknown User'
  );
  
  -- Insert or update profile (handle race conditions)
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    user_full_name,
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    email = EXCLUDED.email,
    full_name = CASE 
      WHEN COALESCE(profiles.full_name, '') = '' THEN EXCLUDED.full_name
      ELSE profiles.full_name
    END,
    updated_at = now();
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user % (%): %', new.id, new.email, SQLERRM;
    RETURN new;
END;
$$;
-- Fix handle_new_user() trigger to restore default role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Try to insert profile
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NOW(),
      NOW()
    );
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, update instead
      UPDATE public.profiles
      SET 
        email = NEW.email,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        updated_at = NOW()
      WHERE id = NEW.id;
    WHEN OTHERS THEN
      -- Log error but don't block signup
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  -- CRITICAL: Assign default 'user' role (RESTORED)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log but don't block signup
      RAISE WARNING 'Failed to assign default role for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Backfill default role for users without any roles (Lisa and 3 others)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'::app_role
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Create monitoring function to detect users without roles
CREATE OR REPLACE FUNCTION public.get_users_without_roles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.full_name, p.created_at
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
  )
  ORDER BY p.created_at DESC;
$$;
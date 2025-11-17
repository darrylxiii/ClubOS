-- Fix Daryl's profile
UPDATE profiles 
SET full_name = 'Daryl'
WHERE id = '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5'
  AND (full_name IS NULL OR full_name = '');

-- Update handle_new_user trigger to ensure full_name is always populated
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1) -- Use email prefix as fallback
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name, SPLIT_PART(EXCLUDED.email, '@', 1)),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
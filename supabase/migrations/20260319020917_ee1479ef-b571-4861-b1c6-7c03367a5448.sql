
-- 1. Enhance handle_new_user to auto-link candidate_profiles by email on signup
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

  -- Auto-link orphan candidate_profiles by email
  UPDATE public.candidate_profiles
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$;

-- 2. Create trigger to backfill applications.user_id when candidate_profiles.user_id is set
CREATE OR REPLACE FUNCTION public.sync_application_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
    UPDATE public.applications
    SET user_id = NEW.user_id
    WHERE candidate_id = NEW.id
      AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop if exists to avoid duplicate
DROP TRIGGER IF EXISTS trg_sync_application_user_id ON public.candidate_profiles;

CREATE TRIGGER trg_sync_application_user_id
  AFTER UPDATE OF user_id ON public.candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_application_user_id();

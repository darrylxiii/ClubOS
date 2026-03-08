-- Create a function to hash meeting passwords using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add a hashed_password column alongside the existing meeting_password
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS password_hash text;

-- Create a trigger to auto-hash passwords on insert/update
CREATE OR REPLACE FUNCTION public.hash_meeting_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.meeting_password IS NOT NULL AND NEW.meeting_password != '' THEN
    NEW.password_hash := crypt(NEW.meeting_password, gen_salt('bf'));
    NEW.meeting_password := NULL; -- Clear plaintext
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_meeting_password ON public.meetings;
CREATE TRIGGER trg_hash_meeting_password
  BEFORE INSERT OR UPDATE OF meeting_password ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_meeting_password();

-- Create a function to verify meeting passwords
CREATE OR REPLACE FUNCTION public.verify_meeting_password(p_meeting_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT password_hash INTO v_hash FROM public.meetings WHERE id = p_meeting_id;
  IF v_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN v_hash = crypt(p_password, v_hash);
END;
$$;
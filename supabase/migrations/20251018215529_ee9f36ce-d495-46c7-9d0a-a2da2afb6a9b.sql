-- Fix function search paths for meeting-related functions
CREATE OR REPLACE FUNCTION public.generate_meeting_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 10));
    SELECT EXISTS(SELECT 1 FROM public.meetings WHERE meeting_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_meeting_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.meeting_code IS NULL OR NEW.meeting_code = '' THEN
    NEW.meeting_code := generate_meeting_code();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_meetings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
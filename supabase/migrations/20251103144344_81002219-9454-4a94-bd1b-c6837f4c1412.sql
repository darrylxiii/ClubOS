-- Fix search_path for create_default_email_labels function
-- This resolves the "relation email_labels does not exist" error during user signup

CREATE OR REPLACE FUNCTION public.create_default_email_labels()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.email_labels (user_id, name, color, icon, type, sort_order) VALUES
  (NEW.id, 'Hot Leads', '#EF4444', 'Flame', 'system', 1),
  (NEW.id, 'Interviews', '#F59E0B', 'Calendar', 'system', 2),
  (NEW.id, 'Offers', '#10B981', 'Briefcase', 'system', 3),
  (NEW.id, 'Networking', '#3B82F6', 'Users', 'system', 4),
  (NEW.id, 'Newsletters', '#6B7280', 'Newspaper', 'system', 5),
  (NEW.id, 'Follow Up', '#8B5CF6', 'Clock', 'system', 6);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_default_email_labels() IS 
'Creates default email labels for new users. Uses explicit search_path to ensure tables are found in public schema when triggered from auth.users.';
-- Fix auto_create_company_board trigger to handle NULL auth.uid() (service role context)
CREATE OR REPLACE FUNCTION public.auto_create_company_board()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create board if there is an authenticated user session
  -- Service role calls (e.g., edge function provisioning) will skip this
  -- and create the board explicitly with the correct owner_id
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.task_boards (name, description, visibility, owner_id, company_id, icon)
    VALUES (
      NEW.name || ' Team Board',
      'Shared board for all ' || NEW.name || ' team members',
      'company',
      auth.uid(),
      NEW.id,
      '🏢'
    );
  END IF;
  RETURN NEW;
END;
$$;
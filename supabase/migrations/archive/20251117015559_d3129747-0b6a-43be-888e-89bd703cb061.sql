-- Fix the auto_create_company_board function to use auth.uid() instead of NEW.created_by
-- since the companies table doesn't have a created_by column

CREATE OR REPLACE FUNCTION public.auto_create_company_board()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create a default task board for the company
  -- Use auth.uid() for the owner_id since we don't have created_by on companies table
  INSERT INTO public.task_boards (name, description, visibility, owner_id, company_id, icon)
  VALUES (
    NEW.name || ' Team Board',
    'Shared board for all ' || NEW.name || ' team members',
    'company',
    auth.uid(), -- Use auth.uid() instead of NEW.created_by
    NEW.id,
    '🏢'
  );
  RETURN NEW;
END;
$$;
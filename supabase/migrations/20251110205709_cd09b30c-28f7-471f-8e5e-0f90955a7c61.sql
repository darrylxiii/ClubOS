-- Fix SECURITY DEFINER functions missing SET search_path
-- This prevents privilege escalation through schema injection attacks

-- Fix archive_expired_documents
CREATE OR REPLACE FUNCTION public.archive_expired_documents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE candidate_documents
  SET archived = TRUE,
      archived_at = NOW()
  WHERE expiry_date < CURRENT_DATE
    AND archived = FALSE
    AND uploaded_by_role IN ('admin', 'partner', 'strategist');
END;
$$;

-- Fix auto_create_company_board
CREATE OR REPLACE FUNCTION public.auto_create_company_board()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_boards (name, description, visibility, owner_id, company_id, icon)
  VALUES (
    NEW.name || ' Team Board',
    'Shared board for all ' || NEW.name || ' team members',
    'company',
    NEW.created_by,
    NEW.id,
    '🏢'
  );
  RETURN NEW;
END;
$$;

-- Fix update_expired_assignments
CREATE OR REPLACE FUNCTION public.update_expired_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.assessment_assignments
  SET status = 'expired'
  WHERE status = 'pending' 
    AND due_date IS NOT NULL 
    AND due_date < now();
END;
$$;
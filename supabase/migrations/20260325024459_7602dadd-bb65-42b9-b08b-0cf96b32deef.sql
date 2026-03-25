
DROP FUNCTION IF EXISTS public.generate_task_number();

CREATE FUNCTION public.generate_task_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN task_number ~ '^TASK-[0-9]+$'
         THEN CAST(SUBSTRING(task_number FROM 6) AS integer)
         ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM public.unified_tasks;

  NEW.task_number := 'TASK-' || LPAD(next_num::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_task_number
  BEFORE INSERT ON public.unified_tasks
  FOR EACH ROW
  WHEN (NEW.task_number IS NULL OR NEW.task_number = '')
  EXECUTE FUNCTION public.generate_task_number();


-- Fix release_stuck_queue_items() to also handle NULL locked_at
CREATE OR REPLACE FUNCTION public.release_stuck_queue_items()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count integer;
BEGIN
  UPDATE blog_generation_queue
  SET status = 'pending',
      locked_at = NULL,
      updated_at = now()
  WHERE status = 'generating'
    AND (
      (locked_at IS NOT NULL AND locked_at < now() - interval '10 minutes')
      OR
      (locked_at IS NULL AND updated_at < now() - interval '10 minutes')
    );
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;

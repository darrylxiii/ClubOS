
-- Phase 3: Add locked_at for idempotent queue claiming
ALTER TABLE public.blog_generation_queue 
ADD COLUMN IF NOT EXISTS locked_at timestamptz DEFAULT NULL;

-- Create function for atomic queue claiming
CREATE OR REPLACE FUNCTION public.claim_blog_queue_item()
RETURNS SETOF blog_generation_queue
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE blog_generation_queue
  SET status = 'generating', locked_at = now(), updated_at = now()
  WHERE id = (
    SELECT id FROM blog_generation_queue
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

-- Create function to release stuck queue items (generating for >10 min)
CREATE OR REPLACE FUNCTION public.release_stuck_queue_items()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH released AS (
    UPDATE blog_generation_queue
    SET status = 'pending', locked_at = NULL, updated_at = now()
    WHERE status = 'generating' AND locked_at < now() - interval '10 minutes'
    RETURNING id
  )
  SELECT count(*)::integer FROM released;
$$;

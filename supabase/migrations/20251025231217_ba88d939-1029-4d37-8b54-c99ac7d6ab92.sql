-- Fix security warning: Set search_path for cleanup_post_reposts function
CREATE OR REPLACE FUNCTION cleanup_post_reposts()
RETURNS TRIGGER AS $$
BEGIN
  -- If the deleted post was a repost (had repost_of), delete its tracking entry
  IF OLD.repost_of IS NOT NULL THEN
    DELETE FROM post_reposts
    WHERE original_post_id = OLD.repost_of
      AND reposted_by = OLD.user_id
      AND reposted_at >= OLD.created_at - INTERVAL '1 second'
      AND reposted_at <= OLD.created_at + INTERVAL '1 second';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
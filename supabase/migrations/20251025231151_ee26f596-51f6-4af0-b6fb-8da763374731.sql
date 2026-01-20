-- Add repost_post_id column to link tracking entries to actual repost posts
ALTER TABLE post_reposts
ADD COLUMN repost_post_id uuid REFERENCES posts(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_post_reposts_repost_post_id ON post_reposts(repost_post_id);

-- Clean up existing orphaned post_reposts entries (one-time cleanup)
DELETE FROM post_reposts pr
WHERE NOT EXISTS (
  SELECT 1 FROM posts p
  WHERE p.repost_of = pr.original_post_id
    AND p.user_id = pr.reposted_by
);

-- Create trigger function to clean up post_reposts when a repost is deleted
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
$$ LANGUAGE plpgsql;

-- Attach trigger to posts table
CREATE TRIGGER trigger_cleanup_post_reposts
  AFTER DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_post_reposts();
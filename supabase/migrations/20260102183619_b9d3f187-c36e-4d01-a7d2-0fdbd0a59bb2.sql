-- Create auto-version trigger function
CREATE OR REPLACE FUNCTION public.save_page_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Only save if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM page_versions WHERE page_id = NEW.id;
    
    -- Insert the OLD content as a version (before the update)
    INSERT INTO page_versions (page_id, content, title, edited_by, version_number)
    VALUES (NEW.id, OLD.content, OLD.title, NEW.last_edited_by, next_version);
    
    -- Keep only last 50 versions per page
    DELETE FROM page_versions 
    WHERE page_id = NEW.id 
    AND id NOT IN (
      SELECT id FROM page_versions 
      WHERE page_id = NEW.id 
      ORDER BY created_at DESC 
      LIMIT 50
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_save_page_version ON workspace_pages;
CREATE TRIGGER trigger_save_page_version
BEFORE UPDATE ON workspace_pages
FOR EACH ROW
EXECUTE FUNCTION public.save_page_version();

-- Add GIN index for content search (for future full-text search)
CREATE INDEX IF NOT EXISTS idx_workspace_pages_content_gin 
ON workspace_pages USING GIN (content jsonb_path_ops);
-- Create function to auto-save page versions
CREATE OR REPLACE FUNCTION save_page_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only save version if content or title changed
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO page_versions (page_id, content, title, edited_by)
    VALUES (NEW.id, OLD.content, OLD.title, NEW.last_edited_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-versioning
DROP TRIGGER IF EXISTS save_page_version_trigger ON workspace_pages;
CREATE TRIGGER save_page_version_trigger
  BEFORE UPDATE ON workspace_pages
  FOR EACH ROW
  EXECUTE FUNCTION save_page_version();

-- Add version_number column to page_versions for ordering
ALTER TABLE page_versions ADD COLUMN IF NOT EXISTS version_number SERIAL;

-- Add invited_by column to page_permissions
ALTER TABLE page_permissions ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);
ALTER TABLE page_permissions ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Update RLS policies for page_versions
DROP POLICY IF EXISTS "Users can view versions of their pages" ON page_versions;
CREATE POLICY "Users can view versions of their pages" ON page_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_pages wp 
      WHERE wp.id = page_versions.page_id 
      AND (wp.user_id = auth.uid() OR wp.visibility = 'public')
    )
    OR EXISTS (
      SELECT 1 FROM page_permissions pp 
      WHERE pp.page_id = page_versions.page_id 
      AND pp.user_id = auth.uid()
    )
  );

-- Update RLS policies for page_permissions  
DROP POLICY IF EXISTS "Page owners can manage permissions" ON page_permissions;
CREATE POLICY "Page owners can manage permissions" ON page_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_pages wp 
      WHERE wp.id = page_permissions.page_id 
      AND wp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their permissions" ON page_permissions;
CREATE POLICY "Users can view their permissions" ON page_permissions
  FOR SELECT USING (user_id = auth.uid() OR email = auth.jwt() ->> 'email');

-- Create index for faster version lookups
CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON page_versions(page_id, created_at DESC);
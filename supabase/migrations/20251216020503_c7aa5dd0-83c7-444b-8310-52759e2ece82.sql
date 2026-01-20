-- Phase 3 & 4: Advanced Editor + Search & Export

-- Create storage bucket for workspace files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-files',
  'workspace-files',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for workspace files
CREATE POLICY "Users can upload workspace files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view workspace files they uploaded"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view shared workspace files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'workspace-files' 
  AND EXISTS (
    SELECT 1 FROM public.workspace_pages wp
    LEFT JOIN public.page_permissions pp ON wp.id = pp.page_id
    WHERE wp.id::text = (storage.foldername(name))[2]
    AND (wp.user_id = auth.uid() OR pp.user_id = auth.uid() OR wp.visibility = 'public')
  )
);

CREATE POLICY "Users can delete their workspace files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Page backlinks table for tracking internal links
CREATE TABLE IF NOT EXISTS public.page_backlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  block_id TEXT,
  link_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_page_id, target_page_id, block_id)
);

-- Page attachments table
CREATE TABLE IF NOT EXISTS public.page_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  block_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_attachments ENABLE ROW LEVEL SECURITY;

-- RLS for backlinks
CREATE POLICY "Users can view backlinks for accessible pages"
ON public.page_backlinks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_pages wp
    LEFT JOIN public.page_permissions pp ON wp.id = pp.page_id
    WHERE wp.id = target_page_id
    AND (wp.user_id = auth.uid() OR pp.user_id = auth.uid() OR wp.visibility = 'public')
  )
);

CREATE POLICY "Users can manage backlinks for their pages"
ON public.page_backlinks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_pages wp
    WHERE wp.id = source_page_id AND wp.user_id = auth.uid()
  )
);

-- RLS for attachments
CREATE POLICY "Users can view attachments for accessible pages"
ON public.page_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_pages wp
    LEFT JOIN public.page_permissions pp ON wp.id = pp.page_id
    WHERE wp.id = page_id
    AND (wp.user_id = auth.uid() OR pp.user_id = auth.uid() OR wp.visibility = 'public')
  )
);

CREATE POLICY "Users can manage their attachments"
ON public.page_attachments FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Add full-text search index on workspace_pages
ALTER TABLE public.workspace_pages ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_page_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content::text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector
DROP TRIGGER IF EXISTS page_search_vector_trigger ON public.workspace_pages;
CREATE TRIGGER page_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content ON public.workspace_pages
  FOR EACH ROW EXECUTE FUNCTION update_page_search_vector();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_workspace_pages_search ON public.workspace_pages USING GIN(search_vector);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_backlinks_source ON public.page_backlinks(source_page_id);
CREATE INDEX IF NOT EXISTS idx_page_backlinks_target ON public.page_backlinks(target_page_id);
CREATE INDEX IF NOT EXISTS idx_page_attachments_page ON public.page_attachments(page_id);
-- Phase 2: Collaboration Features - Complete migration

-- Page comments table for inline discussions
CREATE TABLE IF NOT EXISTS public.page_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  block_id TEXT,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.page_comments(id) ON DELETE CASCADE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Page mentions table
CREATE TABLE IF NOT EXISTS public.page_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.page_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  mentioned_by UUID NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Page presence table for real-time viewer tracking
CREATE TABLE IF NOT EXISTS public.page_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cursor_position JSONB,
  is_editing BOOLEAN DEFAULT false,
  UNIQUE(page_id, user_id)
);

-- Enable RLS
ALTER TABLE public.page_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_presence ENABLE ROW LEVEL SECURITY;

-- RLS policies for page_comments
CREATE POLICY "comments_select_policy"
  ON public.page_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_pages wp
      WHERE wp.id = page_comments.page_id
      AND (wp.user_id = auth.uid() OR wp.visibility = 'public'
        OR EXISTS (SELECT 1 FROM page_permissions pp WHERE pp.page_id = wp.id AND pp.user_id = auth.uid()))
    )
  );

CREATE POLICY "comments_insert_policy"
  ON public.page_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM workspace_pages wp
      WHERE wp.id = page_comments.page_id
      AND (wp.user_id = auth.uid() OR wp.visibility = 'public'
        OR EXISTS (SELECT 1 FROM page_permissions pp WHERE pp.page_id = wp.id AND pp.user_id = auth.uid()))
    )
  );

CREATE POLICY "comments_update_policy"
  ON public.page_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "comments_delete_policy"
  ON public.page_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for page_mentions
CREATE POLICY "mentions_select_policy"
  ON public.page_mentions FOR SELECT
  USING (auth.uid() = mentioned_user_id OR auth.uid() = mentioned_by);

CREATE POLICY "mentions_insert_policy"
  ON public.page_mentions FOR INSERT
  WITH CHECK (auth.uid() = mentioned_by);

CREATE POLICY "mentions_update_policy"
  ON public.page_mentions FOR UPDATE
  USING (auth.uid() = mentioned_user_id);

-- RLS policies for page_presence
CREATE POLICY "presence_select_policy"
  ON public.page_presence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_pages wp
      WHERE wp.id = page_presence.page_id
      AND (wp.user_id = auth.uid() OR wp.visibility = 'public'
        OR EXISTS (SELECT 1 FROM page_permissions pp WHERE pp.page_id = wp.id AND pp.user_id = auth.uid()))
    )
  );

CREATE POLICY "presence_all_policy"
  ON public.page_presence FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_page_comments_page_id ON public.page_comments(page_id);
CREATE INDEX idx_page_comments_parent_id ON public.page_comments(parent_id);
CREATE INDEX idx_page_mentions_mentioned_user ON public.page_mentions(mentioned_user_id);
CREATE INDEX idx_page_presence_page_id ON public.page_presence(page_id);

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_presence;

-- Trigger for updated_at on comments
CREATE TRIGGER update_page_comments_updated_at
  BEFORE UPDATE ON public.page_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
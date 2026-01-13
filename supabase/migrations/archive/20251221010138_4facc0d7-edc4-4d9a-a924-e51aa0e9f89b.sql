-- Create page activity log for tracking edits, views, comments
CREATE TABLE IF NOT EXISTS public.page_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('view', 'edit', 'comment', 'share', 'restore', 'create', 'delete', 'move')),
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create page analytics summary for dashboard
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  view_count INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  edit_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  avg_time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_id, date)
);

-- Enable RLS
ALTER TABLE public.page_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for page_activity
CREATE POLICY "Users can view activity for pages they have access to"
ON public.page_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_pages wp
    JOIN public.workspace_members wm ON wm.workspace_id = wp.workspace_id
    WHERE wp.id = page_activity.page_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert activity for pages they have access to"
ON public.page_activity FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_pages wp
    JOIN public.workspace_members wm ON wm.workspace_id = wp.workspace_id
    WHERE wp.id = page_activity.page_id
    AND wm.user_id = auth.uid()
  )
);

-- RLS policies for page_analytics
CREATE POLICY "Users can view analytics for pages they have access to"
ON public.page_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_pages wp
    JOIN public.workspace_members wm ON wm.workspace_id = wp.workspace_id
    WHERE wp.id = page_analytics.page_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage analytics"
ON public.page_analytics FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_page_activity_page ON public.page_activity(page_id);
CREATE INDEX idx_page_activity_user ON public.page_activity(user_id);
CREATE INDEX idx_page_activity_created ON public.page_activity(created_at DESC);
CREATE INDEX idx_page_activity_type ON public.page_activity(activity_type);
CREATE INDEX idx_page_analytics_page_date ON public.page_analytics(page_id, date DESC);
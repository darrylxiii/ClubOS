-- Create workspace_pages table for Notion-like pages
CREATE TABLE public.workspace_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_page_id UUID REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  icon_emoji TEXT,
  icon_url TEXT,
  cover_url TEXT,
  content JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  is_template BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
  last_edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create page_templates table for quick page creation
CREATE TABLE public.page_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  content JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create page_permissions table for sharing
CREATE TABLE public.page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'comment', 'edit', 'full')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create page_visits table for recent pages
CREATE TABLE public.page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, page_id)
);

-- Create page_versions table for version history
CREATE TABLE public.page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  title TEXT,
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_workspace_pages_user_id ON public.workspace_pages(user_id);
CREATE INDEX idx_workspace_pages_parent_id ON public.workspace_pages(parent_page_id);
CREATE INDEX idx_workspace_pages_visibility ON public.workspace_pages(visibility);
CREATE INDEX idx_workspace_pages_is_favorite ON public.workspace_pages(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_workspace_pages_is_archived ON public.workspace_pages(is_archived);
CREATE INDEX idx_page_permissions_page_id ON public.page_permissions(page_id);
CREATE INDEX idx_page_permissions_user_id ON public.page_permissions(user_id);
CREATE INDEX idx_page_visits_user_id ON public.page_visits(user_id);
CREATE INDEX idx_page_versions_page_id ON public.page_versions(page_id);

-- Enable RLS
ALTER TABLE public.workspace_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_pages
CREATE POLICY "Users can view own pages" ON public.workspace_pages
  FOR SELECT USING (
    auth.uid() = user_id 
    OR visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM public.page_permissions 
      WHERE page_id = workspace_pages.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own pages" ON public.workspace_pages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pages" ON public.workspace_pages
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.page_permissions 
      WHERE page_id = workspace_pages.id 
      AND user_id = auth.uid() 
      AND permission_level IN ('edit', 'full')
    )
  );

CREATE POLICY "Users can delete own pages" ON public.workspace_pages
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for page_templates
CREATE POLICY "Anyone can view system templates" ON public.page_templates
  FOR SELECT USING (is_system = true OR created_by = auth.uid());

CREATE POLICY "Users can create own templates" ON public.page_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates" ON public.page_templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates" ON public.page_templates
  FOR DELETE USING (auth.uid() = created_by AND is_system = false);

-- RLS Policies for page_permissions
CREATE POLICY "Page owners can manage permissions" ON public.page_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_pages 
      WHERE id = page_permissions.page_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own permissions" ON public.page_permissions
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for page_visits
CREATE POLICY "Users can manage own visits" ON public.page_visits
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for page_versions
CREATE POLICY "Users can view versions of accessible pages" ON public.page_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_pages 
      WHERE id = page_versions.page_id 
      AND (user_id = auth.uid() OR visibility = 'public')
    )
  );

CREATE POLICY "Users can create versions for own pages" ON public.page_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_pages 
      WHERE id = page_versions.page_id AND user_id = auth.uid()
    )
  );

-- Update trigger for workspace_pages
CREATE TRIGGER update_workspace_pages_updated_at
  BEFORE UPDATE ON public.workspace_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_pages;

-- Insert system templates
INSERT INTO public.page_templates (name, description, icon, content, category, is_system) VALUES
(
  'Meeting Notes',
  'Capture meeting discussions, decisions, and action items',
  '📝',
  '[{"type":"heading","props":{"level":1},"content":[{"type":"text","text":"Meeting Notes"}]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Attendees"}]},{"type":"bulletListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Agenda"}]},{"type":"numberedListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Discussion"}]},{"type":"paragraph","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Action Items"}]},{"type":"checkListItem","content":[]}]',
  'work',
  true
),
(
  'Weekly Planner',
  'Plan and organize your week',
  '📅',
  '[{"type":"heading","props":{"level":1},"content":[{"type":"text","text":"Weekly Planner"}]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Goals for This Week"}]},{"type":"checkListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Monday"}]},{"type":"bulletListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Tuesday"}]},{"type":"bulletListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Wednesday"}]},{"type":"bulletListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Thursday"}]},{"type":"bulletListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Friday"}]},{"type":"bulletListItem","content":[]}]',
  'personal',
  true
),
(
  'Project Brief',
  'Define project scope, goals, and timeline',
  '📋',
  '[{"type":"heading","props":{"level":1},"content":[{"type":"text","text":"Project Brief"}]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Overview"}]},{"type":"paragraph","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Objectives"}]},{"type":"bulletListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Scope"}]},{"type":"paragraph","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Timeline"}]},{"type":"paragraph","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Team"}]},{"type":"bulletListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Success Metrics"}]},{"type":"numberedListItem","content":[]}]',
  'work',
  true
),
(
  'Interview Prep',
  'Prepare for candidate interviews',
  '🎯',
  '[{"type":"heading","props":{"level":1},"content":[{"type":"text","text":"Interview Prep"}]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Candidate Info"}]},{"type":"paragraph","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Key Questions"}]},{"type":"numberedListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Skills to Assess"}]},{"type":"checkListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Notes"}]},{"type":"paragraph","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Decision"}]},{"type":"paragraph","content":[]}]',
  'tqc',
  true
),
(
  'Client Notes',
  'Track client interactions and requirements',
  '🏢',
  '[{"type":"heading","props":{"level":1},"content":[{"type":"text","text":"Client Notes"}]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Company Overview"}]},{"type":"paragraph","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Key Contacts"}]},{"type":"bulletListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Requirements"}]},{"type":"checkListItem","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Meeting History"}]},{"type":"paragraph","content":[]},{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Next Steps"}]},{"type":"numberedListItem","content":[]}]',
  'tqc',
  true
),
(
  'Blank',
  'Start with a clean slate',
  '📄',
  '[]',
  'basic',
  true
);
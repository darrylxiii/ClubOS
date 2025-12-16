-- Create enum for database column types
CREATE TYPE workspace_db_column_type AS ENUM (
  'text', 'number', 'date', 'checkbox', 'select', 'multi_select', 
  'person', 'url', 'email', 'phone', 'relation', 'formula', 'created_time', 'updated_time'
);

-- Create enum for database view types
CREATE TYPE workspace_db_view_type AS ENUM ('table', 'board', 'gallery', 'list', 'calendar');

-- Workspace databases table
CREATE TABLE public.workspace_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Database',
  description TEXT,
  icon TEXT,
  cover_url TEXT,
  is_inline BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Database columns/properties
CREATE TABLE public.workspace_database_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES public.workspace_databases(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  column_type workspace_db_column_type NOT NULL DEFAULT 'text',
  options JSONB DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  width INTEGER DEFAULT 200,
  is_primary BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Database rows
CREATE TABLE public.workspace_database_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES public.workspace_databases(id) ON DELETE CASCADE NOT NULL,
  data JSONB DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Database views
CREATE TABLE public.workspace_database_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES public.workspace_databases(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default View',
  view_type workspace_db_view_type NOT NULL DEFAULT 'table',
  config JSONB DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workspace_databases_page_id ON public.workspace_databases(page_id);
CREATE INDEX idx_workspace_database_columns_database_id ON public.workspace_database_columns(database_id);
CREATE INDEX idx_workspace_database_rows_database_id ON public.workspace_database_rows(database_id);
CREATE INDEX idx_workspace_database_views_database_id ON public.workspace_database_views(database_id);

-- Enable RLS
ALTER TABLE public.workspace_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_database_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_database_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_database_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_databases
CREATE POLICY "Users can view databases on pages they can access"
  ON public.workspace_databases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_pages wp
      WHERE wp.id = workspace_databases.page_id
      AND (wp.user_id = auth.uid() OR wp.visibility = 'public'
        OR EXISTS (SELECT 1 FROM public.page_permissions pp WHERE pp.page_id = wp.id AND pp.user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can create databases on their pages"
  ON public.workspace_databases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_pages wp
      WHERE wp.id = page_id AND wp.user_id = auth.uid()
    )
  );

CREATE POLICY "Database owners can update"
  ON public.workspace_databases FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Database owners can delete"
  ON public.workspace_databases FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for columns
CREATE POLICY "Users can view columns of accessible databases"
  ON public.workspace_database_columns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_databases wd
      WHERE wd.id = workspace_database_columns.database_id
      AND (wd.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.workspace_pages wp
        WHERE wp.id = wd.page_id AND (wp.visibility = 'public' OR wp.user_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Database owners can manage columns"
  ON public.workspace_database_columns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_databases wd
      WHERE wd.id = database_id AND wd.user_id = auth.uid()
    )
  );

-- RLS Policies for rows
CREATE POLICY "Users can view rows of accessible databases"
  ON public.workspace_database_rows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_databases wd
      WHERE wd.id = workspace_database_rows.database_id
      AND (wd.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.workspace_pages wp
        WHERE wp.id = wd.page_id AND (wp.visibility = 'public' OR wp.user_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Database owners can manage rows"
  ON public.workspace_database_rows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_databases wd
      WHERE wd.id = database_id AND wd.user_id = auth.uid()
    )
  );

-- RLS Policies for views
CREATE POLICY "Users can view database views"
  ON public.workspace_database_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_databases wd
      WHERE wd.id = workspace_database_views.database_id
      AND (wd.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.workspace_pages wp
        WHERE wp.id = wd.page_id AND (wp.visibility = 'public' OR wp.user_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Database owners can manage views"
  ON public.workspace_database_views FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_databases wd
      WHERE wd.id = database_id AND wd.user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_databases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_database_rows;

-- Update timestamp triggers
CREATE TRIGGER update_workspace_databases_updated_at
  BEFORE UPDATE ON public.workspace_databases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_database_columns_updated_at
  BEFORE UPDATE ON public.workspace_database_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_database_rows_updated_at
  BEFORE UPDATE ON public.workspace_database_rows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_database_views_updated_at
  BEFORE UPDATE ON public.workspace_database_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
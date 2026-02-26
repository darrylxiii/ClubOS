
-- ============================================================
-- Blog System Tables for The Quantum Club
-- ============================================================

-- 1. blog_posts
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  category text NOT NULL,
  content jsonb DEFAULT '[]'::jsonb,
  content_format text,
  hero_image jsonb,
  author_id text,
  keywords text[],
  key_takeaways text[],
  related_products text[],
  meta_title text,
  meta_description text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  scheduled_for timestamptz,
  ai_generated boolean DEFAULT false,
  generation_prompt text,
  performance_score integer,
  freshness_score integer,
  last_refreshed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read published posts
CREATE POLICY "Published blog posts are publicly readable"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

-- Authenticated users can manage posts (admin check in app layer)
CREATE POLICY "Authenticated users can manage blog posts"
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. blog_generation_queue
CREATE TABLE public.blog_generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  category text NOT NULL,
  target_keywords text[],
  priority integer DEFAULT 5,
  content_format text,
  source text DEFAULT 'user',
  status text NOT NULL DEFAULT 'pending',
  generated_post_id uuid REFERENCES public.blog_posts(id),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage blog queue"
  ON public.blog_generation_queue FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. blog_analytics (daily aggregated metrics)
CREATE TABLE public.blog_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  page_views integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  avg_time_on_page integer DEFAULT 0,
  scroll_depth real DEFAULT 0,
  cta_clicks integer DEFAULT 0,
  bounce_rate real DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_slug, date)
);

ALTER TABLE public.blog_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog analytics are publicly insertable"
  ON public.blog_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Blog analytics are publicly readable"
  ON public.blog_analytics FOR SELECT
  USING (true);

CREATE POLICY "Blog analytics are updatable by service"
  ON public.blog_analytics FOR UPDATE
  USING (true);

-- 4. blog_page_views (raw events)
CREATE TABLE public.blog_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug text NOT NULL,
  anonymous_id text NOT NULL,
  session_id text,
  referrer text,
  user_agent text,
  device_type text,
  max_scroll_depth real DEFAULT 0,
  time_on_page integer DEFAULT 0,
  cta_clicks jsonb DEFAULT '[]'::jsonb,
  exited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog page views are publicly insertable"
  ON public.blog_page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Blog page views are publicly updatable"
  ON public.blog_page_views FOR UPDATE
  USING (true);

CREATE POLICY "Blog page views are readable by authenticated"
  ON public.blog_page_views FOR SELECT
  TO authenticated
  USING (true);

-- 5. blog_bookmarks
CREATE TABLE public.blog_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug text NOT NULL,
  user_id uuid,
  anonymous_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert bookmarks"
  ON public.blog_bookmarks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own bookmarks"
  ON public.blog_bookmarks FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

CREATE POLICY "Users can delete own bookmarks"
  ON public.blog_bookmarks FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

-- 6. blog_reactions
CREATE TABLE public.blog_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug text NOT NULL,
  reaction_type text NOT NULL,
  anonymous_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage reactions"
  ON public.blog_reactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. blog_learnings
CREATE TABLE public.blog_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_type text NOT NULL UNIQUE,
  insight text NOT NULL,
  confidence real DEFAULT 0.5,
  source_posts uuid[],
  is_active boolean DEFAULT true,
  applied_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage blog learnings"
  ON public.blog_learnings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. blog_engine_settings (single row)
CREATE TABLE public.blog_engine_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean DEFAULT false,
  posts_per_day integer DEFAULT 1,
  preferred_formats text[] DEFAULT ARRAY['career-playbook', 'market-analysis', 'success-story'],
  auto_publish boolean DEFAULT false,
  require_medical_review boolean DEFAULT false,
  min_quality_score integer DEFAULT 60,
  publishing_window_start text DEFAULT '09:00',
  publishing_window_end text DEFAULT '17:00',
  categories text[] DEFAULT ARRAY['career-insights', 'talent-strategy', 'industry-trends', 'leadership'],
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.blog_engine_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage engine settings"
  ON public.blog_engine_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. blog_content_signals
CREATE TABLE public.blog_content_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text NOT NULL,
  signal_value text NOT NULL,
  source text DEFAULT 'manual',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_content_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage signals"
  ON public.blog_content_signals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 10. blog_post_relations
CREATE TABLE public.blog_post_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_post_id uuid REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  related_post_id uuid REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  similarity_score real DEFAULT 0,
  relation_type text DEFAULT 'semantic',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_post_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog relations are publicly readable"
  ON public.blog_post_relations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can manage relations"
  ON public.blog_post_relations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Storage bucket for blog images
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

CREATE POLICY "Blog images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated users can upload blog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Service role can manage blog images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'blog-images');

-- Seed blog engine settings (single row)
INSERT INTO public.blog_engine_settings (is_active, posts_per_day, auto_publish, min_quality_score)
VALUES (false, 1, false, 60);

-- Indexes
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_analytics_post_date ON public.blog_analytics(post_slug, date);
CREATE INDEX idx_blog_page_views_post ON public.blog_page_views(post_slug);
CREATE INDEX idx_blog_queue_status ON public.blog_generation_queue(status);

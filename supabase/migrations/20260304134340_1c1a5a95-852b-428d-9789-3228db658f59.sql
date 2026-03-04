-- Add unique constraint to blog_post_relations for upsert support
ALTER TABLE public.blog_post_relations 
ADD CONSTRAINT uq_source_related UNIQUE (source_post_id, related_post_id);

-- ============================================================
-- TIGHTEN RLS: blog_posts — keep public SELECT on published, restrict writes to admin/strategist
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage blog posts" ON public.blog_posts;

CREATE POLICY "Admins and strategists can manage blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
);

-- ============================================================
-- TIGHTEN RLS: blog_generation_queue
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage blog queue" ON public.blog_generation_queue;

CREATE POLICY "Admins and strategists can manage blog queue"
ON public.blog_generation_queue
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
);

-- ============================================================
-- TIGHTEN RLS: blog_engine_settings
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage engine settings" ON public.blog_engine_settings;

CREATE POLICY "Admins and strategists can manage engine settings"
ON public.blog_engine_settings
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
);

-- ============================================================
-- TIGHTEN RLS: blog_learnings
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage blog learnings" ON public.blog_learnings;

CREATE POLICY "Admins and strategists can manage blog learnings"
ON public.blog_learnings
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
);

-- ============================================================
-- TIGHTEN RLS: blog_content_signals
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage signals" ON public.blog_content_signals;

CREATE POLICY "Admins and strategists can manage signals"
ON public.blog_content_signals
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
);

-- ============================================================
-- TIGHTEN RLS: blog_analytics — remove public write, keep public read
-- ============================================================
DROP POLICY IF EXISTS "Blog analytics are publicly insertable" ON public.blog_analytics;
DROP POLICY IF EXISTS "Blog analytics are updatable by service" ON public.blog_analytics;

-- Only service role (edge functions) can insert/update analytics
-- No public INSERT/UPDATE policies means only service_role key bypasses RLS
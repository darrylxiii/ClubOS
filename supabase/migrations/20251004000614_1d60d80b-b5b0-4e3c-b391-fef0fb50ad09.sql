-- ============================================
-- ENHANCED COMPANY PROFILE MODULE
-- Posts, Analytics, Branding, Followers
-- ============================================

-- Company Posts (News, Updates, Media)
CREATE TABLE IF NOT EXISTS public.company_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('news', 'milestone', 'event', 'update', 'media')),
  
  media_urls JSONB DEFAULT '[]'::jsonb,
  media_types JSONB DEFAULT '[]'::jsonb,
  
  is_featured BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  
  view_count INTEGER DEFAULT 0,
  
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_posts_company ON public.company_posts(company_id);
CREATE INDEX idx_company_posts_published ON public.company_posts(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_company_posts_featured ON public.company_posts(is_featured) WHERE is_featured = true;

-- Company Post Reactions
CREATE TABLE IF NOT EXISTS public.company_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.company_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'insightful', 'celebrate')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX idx_post_reactions_post ON public.company_post_reactions(post_id);
CREATE INDEX idx_post_reactions_user ON public.company_post_reactions(user_id);

-- Company Post Comments
CREATE TABLE IF NOT EXISTS public.company_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.company_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_comments_post ON public.company_post_comments(post_id);

-- Company Followers
CREATE TABLE IF NOT EXISTS public.company_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  notification_enabled BOOLEAN DEFAULT true,
  
  followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_followers_company ON public.company_followers(company_id);
CREATE INDEX idx_company_followers_user ON public.company_followers(user_id);

-- Company Branding
CREATE TABLE IF NOT EXISTS public.company_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',
  accent_color TEXT DEFAULT '#ec4899',
  
  logo_light_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  
  font_heading TEXT DEFAULT 'Inter',
  font_body TEXT DEFAULT 'Inter',
  
  custom_css TEXT,
  
  social_preview_image TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company Analytics
CREATE TABLE IF NOT EXISTS public.company_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  profile_views INTEGER DEFAULT 0,
  job_views INTEGER DEFAULT 0,
  application_starts INTEGER DEFAULT 0,
  application_completes INTEGER DEFAULT 0,
  
  post_views INTEGER DEFAULT 0,
  post_engagements INTEGER DEFAULT 0,
  
  follower_count INTEGER DEFAULT 0,
  
  referral_sources JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, date)
);

CREATE INDEX idx_company_analytics_company ON public.company_analytics(company_id);
CREATE INDEX idx_company_analytics_date ON public.company_analytics(date DESC);

-- Job Analytics
CREATE TABLE IF NOT EXISTS public.job_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  
  application_starts INTEGER DEFAULT 0,
  application_completes INTEGER DEFAULT 0,
  
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  
  avg_time_on_page INTEGER DEFAULT 0,
  
  referral_sources JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(job_id, date)
);

CREATE INDEX idx_job_analytics_job ON public.job_analytics(job_id);
CREATE INDEX idx_job_analytics_date ON public.job_analytics(date DESC);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Company Posts
ALTER TABLE public.company_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public posts are viewable by everyone"
  ON public.company_posts FOR SELECT
  USING (is_public = true AND published_at IS NOT NULL);

CREATE POLICY "Company members can view their company posts"
  ON public.company_posts FOR SELECT
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can create posts"
  ON public.company_posts FOR INSERT
  WITH CHECK (
    is_company_member(auth.uid(), company_id) AND 
    author_id = auth.uid()
  );

CREATE POLICY "Company admins can update posts"
  ON public.company_posts FOR UPDATE
  USING (
    has_company_role(auth.uid(), company_id, 'owner') OR 
    has_company_role(auth.uid(), company_id, 'admin') OR
    author_id = auth.uid()
  );

CREATE POLICY "Company admins can delete posts"
  ON public.company_posts FOR DELETE
  USING (
    has_company_role(auth.uid(), company_id, 'owner') OR 
    has_company_role(auth.uid(), company_id, 'admin')
  );

-- Company Post Reactions
ALTER TABLE public.company_post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON public.company_post_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reactions"
  ON public.company_post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.company_post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Company Post Comments
ALTER TABLE public.company_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments on public posts"
  ON public.company_post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_posts
      WHERE id = post_id AND is_public = true AND published_at IS NOT NULL
    )
  );

CREATE POLICY "Users can create comments"
  ON public.company_post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.company_post_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.company_post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Company Followers
ALTER TABLE public.company_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
  ON public.company_followers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Company members can view followers"
  ON public.company_followers FOR SELECT
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Users can follow companies"
  ON public.company_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow companies"
  ON public.company_followers FOR DELETE
  USING (auth.uid() = user_id);

-- Company Branding
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view company branding"
  ON public.company_branding FOR SELECT
  USING (true);

CREATE POLICY "Company admins can manage branding"
  ON public.company_branding FOR ALL
  USING (
    has_company_role(auth.uid(), company_id, 'owner') OR 
    has_company_role(auth.uid(), company_id, 'admin') OR
    has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    has_company_role(auth.uid(), company_id, 'owner') OR 
    has_company_role(auth.uid(), company_id, 'admin') OR
    has_role(auth.uid(), 'admin')
  );

-- Company Analytics
ALTER TABLE public.company_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view analytics"
  ON public.company_analytics FOR SELECT
  USING (
    is_company_member(auth.uid(), company_id) OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "System can manage analytics"
  ON public.company_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

-- Job Analytics
ALTER TABLE public.job_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view job analytics"
  ON public.job_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id AND is_company_member(auth.uid(), j.company_id)
    ) OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "System can manage job analytics"
  ON public.job_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at on company_posts
CREATE TRIGGER update_company_posts_updated_at
  BEFORE UPDATE ON public.company_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update updated_at on company_branding
CREATE TRIGGER update_company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update updated_at on company_post_comments
CREATE TRIGGER update_company_post_comments_updated_at
  BEFORE UPDATE ON public.company_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
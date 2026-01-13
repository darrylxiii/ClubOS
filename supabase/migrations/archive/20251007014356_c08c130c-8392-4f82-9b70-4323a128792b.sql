-- Enhanced Analytics Tables

-- Post view tracking with detailed metadata
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.unified_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  view_duration_seconds INTEGER,
  device_type TEXT,
  os_type TEXT,
  country TEXT,
  city TEXT,
  referrer_source TEXT,
  is_unique_view BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Interaction tracking
CREATE TABLE IF NOT EXISTS public.post_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.unified_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- like, comment, share, bookmark, click, follow
  interaction_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Viral spread tracking
CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.unified_posts(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_to TEXT, -- platform or method
  share_tree_path TEXT[], -- tracks viral spread
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Profile analytics snapshots
CREATE TABLE IF NOT EXISTS public.profile_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  followers_count INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  top_post_id UUID REFERENCES public.unified_posts(id),
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Achievements and milestones
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  metadata JSONB DEFAULT '{}',
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_showcased BOOLEAN DEFAULT false
);

-- Network influence tracking
CREATE TABLE IF NOT EXISTS public.user_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL, -- follower, mention, collaboration, top_commenter
  interaction_count INTEGER DEFAULT 1,
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, connected_user_id, connection_type)
);

-- Trending topics and hashtags
CREATE TABLE IF NOT EXISTS public.trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  topic_type TEXT NOT NULL, -- hashtag, keyword, theme
  mention_count INTEGER DEFAULT 1,
  engagement_score INTEGER DEFAULT 0,
  trending_period TEXT NOT NULL, -- hourly, daily, weekly
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Analytics insights (AI-generated)
CREATE TABLE IF NOT EXISTS public.analytics_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- best_time_to_post, content_recommendation, audience_insight
  insight_title TEXT NOT NULL,
  insight_content TEXT NOT NULL,
  confidence_score NUMERIC(3,2),
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON public.post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON public.post_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_post_interactions_post_id ON public.post_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_user_id ON public.post_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON public.post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_profile_analytics_user_date ON public.profile_analytics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_network_user_id ON public.user_network(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_period ON public.trending_topics(trending_period, period_start);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_user_id ON public.analytics_insights(user_id);

-- RLS Policies
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_insights ENABLE ROW LEVEL SECURITY;

-- Post views policies
CREATE POLICY "Users can view their own post views"
  ON public.post_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.unified_posts p
    WHERE p.id = post_views.post_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "System can insert post views"
  ON public.post_views FOR INSERT
  WITH CHECK (true);

-- Post interactions policies
CREATE POLICY "Users can view interactions on their posts"
  ON public.post_interactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.unified_posts p
    WHERE p.id = post_interactions.post_id AND p.user_id = auth.uid()
  ) OR user_id = auth.uid());

CREATE POLICY "Users can create interactions"
  ON public.post_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Post shares policies
CREATE POLICY "Users can view shares of their posts"
  ON public.post_shares FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.unified_posts p
    WHERE p.id = post_shares.post_id AND p.user_id = auth.uid()
  ) OR shared_by = auth.uid());

CREATE POLICY "Users can create shares"
  ON public.post_shares FOR INSERT
  WITH CHECK (auth.uid() = shared_by);

-- Profile analytics policies
CREATE POLICY "Users can view their own analytics"
  ON public.profile_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage profile analytics"
  ON public.profile_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

-- User achievements policies
CREATE POLICY "Users can view their achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view showcased achievements"
  ON public.user_achievements FOR SELECT
  USING (is_showcased = true);

CREATE POLICY "System can create achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (true);

-- User network policies
CREATE POLICY "Users can view their network"
  ON public.user_network FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "System can manage network"
  ON public.user_network FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trending topics policies
CREATE POLICY "Anyone can view trending topics"
  ON public.trending_topics FOR SELECT
  USING (true);

-- Analytics insights policies
CREATE POLICY "Users can view their insights"
  ON public.analytics_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their insights"
  ON public.analytics_insights FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_insights;
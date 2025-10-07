-- Social Media Accounts (linked profiles)
CREATE TABLE public.social_media_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'twitter', 'tiktok', 'youtube', 'linkedin', 'facebook')),
  platform_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_url TEXT,
  avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"post": true, "read": true, "analytics": true}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- Unified Posts (aggregated from all platforms)
CREATE TABLE public.unified_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_media_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'twitter', 'tiktok', 'youtube', 'linkedin', 'facebook', 'internal')),
  platform_post_id TEXT,
  post_type TEXT NOT NULL CHECK (post_type IN ('post', 'reel', 'story', 'tweet', 'video', 'carousel', 'article')),
  content TEXT NOT NULL,
  media_urls TEXT[],
  thumbnail_url TEXT,
  hashtags TEXT[],
  mentions TEXT[],
  engagement_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_scheduled BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed', 'deleted')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'followers', 'unlisted')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Post Analytics
CREATE TABLE public.post_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.unified_posts(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  video_completion_rate DECIMAL(5,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, date)
);

-- Unified Comments & Messages
CREATE TABLE public.social_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.unified_posts(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_media_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_comment_id TEXT,
  author_username TEXT NOT NULL,
  author_display_name TEXT,
  author_avatar_url TEXT,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.social_comments(id) ON DELETE CASCADE,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  is_spam BOOLEAN DEFAULT false,
  is_replied BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden', 'replied', 'spam')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hashtags & Trends
CREATE TABLE public.hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  trending_score INTEGER DEFAULT 0,
  category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Content Calendar
CREATE TABLE public.content_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.unified_posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  platforms TEXT[] NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'scheduled', 'published', 'cancelled')),
  assigned_to UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Social Media Campaigns
CREATE TABLE public.social_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  platforms TEXT[] NOT NULL,
  goals JSONB DEFAULT '{}'::jsonb,
  budget DECIMAL(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_media_accounts
CREATE POLICY "Users can view their own social accounts"
  ON public.social_media_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social accounts"
  ON public.social_media_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social accounts"
  ON public.social_media_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social accounts"
  ON public.social_media_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for unified_posts
CREATE POLICY "Users can view their own posts"
  ON public.unified_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public posts"
  ON public.unified_posts FOR SELECT
  USING (visibility = 'public' AND status = 'published');

CREATE POLICY "Users can insert their own posts"
  ON public.unified_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.unified_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.unified_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for post_analytics
CREATE POLICY "Users can view analytics for their posts"
  ON public.post_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_posts
      WHERE unified_posts.id = post_analytics.post_id
      AND unified_posts.user_id = auth.uid()
    )
  );

-- RLS Policies for social_comments
CREATE POLICY "Users can view comments on their posts"
  ON public.social_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_posts
      WHERE unified_posts.id = social_comments.post_id
      AND unified_posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage comments"
  ON public.social_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_posts
      WHERE unified_posts.id = social_comments.post_id
      AND unified_posts.user_id = auth.uid()
    )
  );

-- RLS Policies for hashtags (public read)
CREATE POLICY "Anyone can view hashtags"
  ON public.hashtags FOR SELECT
  USING (true);

-- RLS Policies for content_calendar
CREATE POLICY "Users can manage their calendar"
  ON public.content_calendar FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for social_campaigns
CREATE POLICY "Company members can view campaigns"
  ON public.social_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = social_campaigns.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.is_active = true
    )
  );

-- Indexes for performance
CREATE INDEX idx_social_accounts_user ON public.social_media_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON public.social_media_accounts(platform);
CREATE INDEX idx_unified_posts_user ON public.unified_posts(user_id);
CREATE INDEX idx_unified_posts_platform ON public.unified_posts(platform);
CREATE INDEX idx_unified_posts_status ON public.unified_posts(status);
CREATE INDEX idx_unified_posts_scheduled ON public.unified_posts(scheduled_for) WHERE is_scheduled = true;
CREATE INDEX idx_post_analytics_post ON public.post_analytics(post_id);
CREATE INDEX idx_social_comments_post ON public.social_comments(post_id);
CREATE INDEX idx_social_comments_status ON public.social_comments(status);
CREATE INDEX idx_hashtags_tag ON public.hashtags(tag);
CREATE INDEX idx_content_calendar_user ON public.content_calendar(user_id);
CREATE INDEX idx_content_calendar_date ON public.content_calendar(scheduled_date);

-- Triggers for updated_at
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON public.social_media_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_unified_posts_updated_at
  BEFORE UPDATE ON public.unified_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_comments_updated_at
  BEFORE UPDATE ON public.social_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_calendar_updated_at
  BEFORE UPDATE ON public.content_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_campaigns_updated_at
  BEFORE UPDATE ON public.social_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.unified_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_comments;
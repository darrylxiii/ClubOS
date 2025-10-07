-- Enhanced Social Media Platform Schema
-- Add support for stories, polls, events, articles, reactions, saves, gamification

-- Add new post types and features to unified_posts
ALTER TABLE public.unified_posts 
ADD COLUMN IF NOT EXISTS post_subtype TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS poll_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS poll_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS poll_votes JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_location TEXT,
ADD COLUMN IF NOT EXISTS event_link TEXT,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reach_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS impressions_count INTEGER DEFAULT 0;

-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  caption TEXT,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  is_active BOOLEAN DEFAULT true
);

-- Create story views tracking
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Create post reactions (likes, loves, etc.)
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.unified_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL, -- 'like', 'love', 'celebrate', 'insightful', 'funny'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create saved posts
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.unified_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_name TEXT DEFAULT 'default',
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  UNIQUE(post_id, user_id)
);

-- Create user engagement tracking (gamification)
CREATE TABLE IF NOT EXISTS public.user_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  total_likes_given INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create collaborative posts table
CREATE TABLE IF NOT EXISTS public.collaborative_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.unified_posts(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, pending_review, approved, published
  scheduled_for TIMESTAMP WITH TIME ZONE,
  collaborators UUID[] DEFAULT ARRAY[]::UUID[],
  approvers UUID[] DEFAULT ARRAY[]::UUID[],
  approved_by UUID[] DEFAULT ARRAY[]::UUID[],
  notes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create AI suggestions table
CREATE TABLE IF NOT EXISTS public.ai_content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'hashtags', 'caption', 'timing', 'content_idea'
  content JSONB NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create post scheduling with AI optimization
ALTER TABLE public.content_calendar
ADD COLUMN IF NOT EXISTS ai_suggested_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS custom_captions JSONB DEFAULT '{}'::jsonb;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_user_active ON public.stories(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_user ON public.user_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_posts_status ON public.collaborative_posts(status);
CREATE INDEX IF NOT EXISTS idx_unified_posts_subtype ON public.unified_posts(post_subtype);

-- RLS Policies for stories
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own stories"
ON public.stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Active stories are viewable by everyone"
ON public.stories FOR SELECT
USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can update their own stories"
ON public.stories FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for story views
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their story views"
ON public.story_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = story_views.story_id
    AND stories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can record story views"
ON public.story_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- RLS Policies for post reactions
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
ON public.post_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can add their own reactions"
ON public.post_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.post_reactions FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for saved posts
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their saved posts"
ON public.saved_posts FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for user engagement
ALTER TABLE public.user_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own engagement"
ON public.user_engagement FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own engagement"
ON public.user_engagement FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for collaborative posts
ALTER TABLE public.collaborative_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators can view their posts"
ON public.collaborative_posts FOR SELECT
USING (
  auth.uid() = creator_id OR
  auth.uid() = ANY(collaborators) OR
  auth.uid() = ANY(approvers)
);

CREATE POLICY "Creators can create collaborative posts"
ON public.collaborative_posts FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Collaborators can update posts"
ON public.collaborative_posts FOR UPDATE
USING (
  auth.uid() = creator_id OR
  auth.uid() = ANY(collaborators)
);

-- RLS Policies for AI suggestions
ALTER TABLE public.ai_content_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their AI suggestions"
ON public.ai_content_suggestions FOR ALL
USING (auth.uid() = user_id);

-- Function to update engagement streaks
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_engagement (user_id, current_streak, longest_streak, last_activity_date, total_posts)
  VALUES (NEW.user_id, 1, 1, CURRENT_DATE, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_posts = user_engagement.total_posts + 1,
    current_streak = CASE
      WHEN user_engagement.last_activity_date = CURRENT_DATE - 1 THEN user_engagement.current_streak + 1
      WHEN user_engagement.last_activity_date = CURRENT_DATE THEN user_engagement.current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(
      user_engagement.longest_streak,
      CASE
        WHEN user_engagement.last_activity_date = CURRENT_DATE - 1 THEN user_engagement.current_streak + 1
        WHEN user_engagement.last_activity_date = CURRENT_DATE THEN user_engagement.current_streak
        ELSE 1
      END
    ),
    last_activity_date = CURRENT_DATE,
    experience_points = user_engagement.experience_points + 10,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_engagement_on_post
AFTER INSERT ON public.unified_posts
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_engagement;
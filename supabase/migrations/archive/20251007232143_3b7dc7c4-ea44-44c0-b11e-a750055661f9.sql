-- Create post_engagement_signals table for tracking all post interactions
CREATE TABLE IF NOT EXISTS public.post_engagement_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  
  -- View tracking
  viewed_at TIMESTAMP WITH TIME ZONE,
  view_duration_seconds INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 1,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Engagement tracking
  liked BOOLEAN DEFAULT false,
  liked_at TIMESTAMP WITH TIME ZONE,
  commented BOOLEAN DEFAULT false,
  commented_at TIMESTAMP WITH TIME ZONE,
  shared BOOLEAN DEFAULT false,
  shared_at TIMESTAMP WITH TIME ZONE,
  saved BOOLEAN DEFAULT false,
  saved_at TIMESTAMP WITH TIME ZONE,
  
  -- Advanced tracking
  device_type TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  city TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, post_id)
);

-- Create user_relationships table for tracking connection strength
CREATE TABLE IF NOT EXISTS public.user_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  related_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_score NUMERIC DEFAULT 0,
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, related_user_id),
  CHECK (user_id != related_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagement_signals_post ON public.post_engagement_signals(post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_signals_user ON public.post_engagement_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_signals_viewed ON public.post_engagement_signals(post_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_relationships_user ON public.user_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_score ON public.user_relationships(user_id, relationship_score DESC);

-- Enable RLS
ALTER TABLE public.post_engagement_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_engagement_signals
CREATE POLICY "Users can view their own engagement signals"
  ON public.post_engagement_signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own engagement signals"
  ON public.post_engagement_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own engagement signals"
  ON public.post_engagement_signals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Post owners can view engagement on their posts"
  ON public.post_engagement_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_engagement_signals.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- RLS Policies for user_relationships
CREATE POLICY "Users can view their own relationships"
  ON public.user_relationships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = related_user_id);

CREATE POLICY "System can manage relationships"
  ON public.user_relationships FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to calculate post score for algorithmic feed
CREATE OR REPLACE FUNCTION public.calculate_post_score(
  p_user_id UUID,
  p_post_id UUID,
  p_post_created_at TIMESTAMP WITH TIME ZONE,
  p_post_author_id UUID,
  p_likes_count INTEGER,
  p_comments_count INTEGER,
  p_shares_count INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  recency_score NUMERIC := 0;
  relationship_score NUMERIC := 0;
  engagement_score NUMERIC := 0;
  total_score NUMERIC := 0;
  hours_old NUMERIC;
BEGIN
  -- Recency score (30% weight) - exponential decay
  hours_old := EXTRACT(EPOCH FROM (now() - p_post_created_at)) / 3600;
  recency_score := 30 * EXP(-hours_old / 24); -- Decays over 24 hours
  
  -- Relationship score (40% weight)
  SELECT COALESCE(relationship_score, 0) * 0.4 INTO relationship_score
  FROM public.user_relationships
  WHERE user_id = p_user_id AND related_user_id = p_post_author_id;
  
  -- Engagement score (30% weight)
  engagement_score := (p_likes_count * 1 + p_comments_count * 3 + p_shares_count * 5) * 0.3;
  
  -- Total score
  total_score := recency_score + COALESCE(relationship_score, 0) + engagement_score;
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to update relationship score based on interactions
CREATE OR REPLACE FUNCTION public.update_relationship_score(
  p_user_id UUID,
  p_related_user_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_relationships (
    user_id,
    related_user_id,
    relationship_score,
    last_interaction_at
  )
  VALUES (
    p_user_id,
    p_related_user_id,
    5, -- Initial score
    now()
  )
  ON CONFLICT (user_id, related_user_id)
  DO UPDATE SET
    relationship_score = user_relationships.relationship_score + 5,
    last_interaction_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update engagement signals timestamp
CREATE OR REPLACE FUNCTION update_engagement_signals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_engagement_signals_timestamp
  BEFORE UPDATE ON public.post_engagement_signals
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_signals_timestamp();
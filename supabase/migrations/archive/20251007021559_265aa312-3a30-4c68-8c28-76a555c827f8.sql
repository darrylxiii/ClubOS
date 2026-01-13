-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours'),
  is_active BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0
);

-- Create poll_votes table  
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL,
  option_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'celebrate', 'insightful', 'funny', 'fire')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Add poll fields to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS poll_question TEXT,
ADD COLUMN IF NOT EXISTS poll_options JSONB DEFAULT '[]'::jsonb;

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON public.stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;
DROP POLICY IF EXISTS "Poll votes are viewable by everyone" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can vote on polls" ON public.poll_votes;
DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can create reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.post_reactions;

-- Stories policies
CREATE POLICY "Stories are viewable by everyone" ON public.stories
  FOR SELECT USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can create their own stories" ON public.stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON public.stories
  FOR DELETE USING (auth.uid() = user_id);

-- Poll votes policies
CREATE POLICY "Poll votes are viewable by everyone" ON public.poll_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote on polls" ON public.poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reaction policies
CREATE POLICY "Reactions are viewable by everyone" ON public.post_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can create reactions" ON public.post_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON public.post_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);

-- Enable realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
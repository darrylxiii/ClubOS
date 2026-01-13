-- Create story_reactions table
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Create story_saves table
CREATE TABLE IF NOT EXISTS public.story_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Create story_shares table
CREATE TABLE IF NOT EXISTS public.story_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_reactions
CREATE POLICY "Users can view all reactions"
ON public.story_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reactions"
ON public.story_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
ON public.story_reactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.story_reactions FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for story_saves
CREATE POLICY "Users can view their own saves"
ON public.story_saves FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saves"
ON public.story_saves FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saves"
ON public.story_saves FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for story_shares
CREATE POLICY "Users can view all shares"
ON public.story_shares FOR SELECT
USING (true);

CREATE POLICY "Users can create their own shares"
ON public.story_shares FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_story_reactions_story_id ON public.story_reactions(story_id);
CREATE INDEX idx_story_reactions_user_id ON public.story_reactions(user_id);
CREATE INDEX idx_story_saves_story_id ON public.story_saves(story_id);
CREATE INDEX idx_story_saves_user_id ON public.story_saves(user_id);
CREATE INDEX idx_story_shares_story_id ON public.story_shares(story_id);
CREATE INDEX idx_story_shares_user_id ON public.story_shares(user_id);
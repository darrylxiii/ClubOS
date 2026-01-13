-- Create story_comments table
CREATE TABLE IF NOT EXISTS public.story_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view comments
CREATE POLICY "Anyone can view story comments"
  ON public.story_comments
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON public.story_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.story_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON public.story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_created_at ON public.story_comments(created_at DESC);
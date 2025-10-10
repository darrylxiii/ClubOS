-- Create pinned_posts table
CREATE TABLE IF NOT EXISTS public.pinned_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pin_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.pinned_posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own pinned posts"
  ON public.pinned_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can pin their own posts"
  ON public.pinned_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unpin their own posts"
  ON public.pinned_posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their pinned posts order"
  ON public.pinned_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Create post_reposts table
CREATE TABLE IF NOT EXISTS public.post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reposted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reposted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(original_post_id, reposted_by)
);

-- Enable RLS
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view reposts"
  ON public.post_reposts FOR SELECT
  USING (true);

CREATE POLICY "Users can repost"
  ON public.post_reposts FOR INSERT
  WITH CHECK (auth.uid() = reposted_by);

CREATE POLICY "Users can unrepost"
  ON public.post_reposts FOR DELETE
  USING (auth.uid() = reposted_by);

-- Add repost_of column to posts table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'repost_of'
  ) THEN
    ALTER TABLE public.posts 
    ADD COLUMN repost_of UUID REFERENCES public.posts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pinned_posts_user_id ON public.pinned_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_original ON public.post_reposts(original_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_repost_of ON public.posts(repost_of);
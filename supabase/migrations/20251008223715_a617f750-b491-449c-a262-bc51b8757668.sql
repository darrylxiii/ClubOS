-- Create company stories table
CREATE TABLE IF NOT EXISTS public.company_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create company post likes table
CREATE TABLE IF NOT EXISTS public.company_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.company_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create company story likes table
CREATE TABLE IF NOT EXISTS public.company_story_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.company_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Create company story views table
CREATE TABLE IF NOT EXISTS public.company_story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.company_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE public.company_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_stories
CREATE POLICY "Anyone can view active company stories"
  ON public.company_stories FOR SELECT
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Company members can create stories"
  ON public.company_stories FOR INSERT
  WITH CHECK (
    is_company_member(auth.uid(), company_id) AND 
    created_by = auth.uid()
  );

CREATE POLICY "Company members can update their stories"
  ON public.company_stories FOR UPDATE
  USING (
    is_company_member(auth.uid(), company_id) AND 
    created_by = auth.uid()
  );

CREATE POLICY "Company members can delete their stories"
  ON public.company_stories FOR DELETE
  USING (
    is_company_member(auth.uid(), company_id) AND 
    created_by = auth.uid()
  );

-- RLS Policies for company_post_likes
CREATE POLICY "Anyone can view post likes"
  ON public.company_post_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like posts"
  ON public.company_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.company_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for company_story_likes
CREATE POLICY "Anyone can view story likes"
  ON public.company_story_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like stories"
  ON public.company_story_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own story likes"
  ON public.company_story_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for company_story_views
CREATE POLICY "Company members can view story views"
  ON public.company_story_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_stories cs
      WHERE cs.id = company_story_views.story_id
        AND is_company_member(auth.uid(), cs.company_id)
    )
  );

CREATE POLICY "Authenticated users can track their views"
  ON public.company_story_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_company_stories_company_id ON public.company_stories(company_id);
CREATE INDEX idx_company_stories_expires_at ON public.company_stories(expires_at);
CREATE INDEX idx_company_post_likes_post_id ON public.company_post_likes(post_id);
CREATE INDEX idx_company_story_likes_story_id ON public.company_story_likes(story_id);
CREATE INDEX idx_company_story_views_story_id ON public.company_story_views(story_id);
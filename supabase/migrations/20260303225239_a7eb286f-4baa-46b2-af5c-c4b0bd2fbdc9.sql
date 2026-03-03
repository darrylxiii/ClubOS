-- Add auto-update trigger for blog_posts.updated_at
CREATE OR REPLACE FUNCTION public.update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop if exists to avoid conflict
DROP TRIGGER IF EXISTS trigger_blog_posts_updated_at ON public.blog_posts;

CREATE TRIGGER trigger_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_blog_posts_updated_at();
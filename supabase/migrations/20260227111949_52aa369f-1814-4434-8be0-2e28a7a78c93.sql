-- Add faq_schema column to blog_posts if not exists
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS faq_schema jsonb DEFAULT '[]'::jsonb;

-- Create index for faster sitemap generation
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_status ON public.blog_posts (status, published_at DESC) WHERE status = 'published';

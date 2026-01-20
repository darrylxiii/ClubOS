-- Add new columns to posts table (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'ai_summary') THEN
    ALTER TABLE public.posts ADD COLUMN ai_summary text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'summary_generated_at') THEN
    ALTER TABLE public.posts ADD COLUMN summary_generated_at timestamp with time zone;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'is_public') THEN
    ALTER TABLE public.posts ADD COLUMN is_public boolean DEFAULT true;
  END IF;
END $$;

-- Add index for better performance on public posts queries
CREATE INDEX IF NOT EXISTS idx_posts_is_public ON public.posts(is_public) WHERE is_public = true;
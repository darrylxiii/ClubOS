-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add secure unsubscribe token to blog_subscribers
ALTER TABLE public.blog_subscribers
ADD COLUMN IF NOT EXISTS unsubscribe_token uuid DEFAULT gen_random_uuid() NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_subscribers_unsubscribe_token
ON public.blog_subscribers (unsubscribe_token);
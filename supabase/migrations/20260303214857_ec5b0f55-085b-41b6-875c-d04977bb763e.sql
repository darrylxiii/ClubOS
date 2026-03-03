
-- Phase 4: Create blog_subscribers table for newsletter capture
CREATE TABLE IF NOT EXISTS public.blog_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text DEFAULT 'blog',
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT blog_subscribers_email_unique UNIQUE (email)
);

ALTER TABLE public.blog_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public insert (anyone can subscribe)
CREATE POLICY "Anyone can subscribe"
ON public.blog_subscribers FOR INSERT TO public
WITH CHECK (true);

-- Only admins can read subscriber list
CREATE POLICY "Admins can read subscribers"
ON public.blog_subscribers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

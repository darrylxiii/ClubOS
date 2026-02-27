
-- Create blog_post_variants table for A/B testing
CREATE TABLE public.blog_post_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  variant_type TEXT NOT NULL DEFAULT 'headline',
  variant_a TEXT NOT NULL,
  variant_b TEXT NOT NULL,
  views_a INTEGER NOT NULL DEFAULT 0,
  views_b INTEGER NOT NULL DEFAULT 0,
  conversions_a INTEGER NOT NULL DEFAULT 0,
  conversions_b INTEGER NOT NULL DEFAULT 0,
  winner TEXT,
  confidence NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_post_variants ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (using user_roles table)
CREATE POLICY "Admins can manage blog variants"
  ON public.blog_post_variants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- Public read for active variants (needed for tracking)
CREATE POLICY "Public can read active variants"
  ON public.blog_post_variants
  FOR SELECT
  USING (is_active = true);

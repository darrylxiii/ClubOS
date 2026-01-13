-- Add missing columns to story_views table
ALTER TABLE public.story_views
ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS watch_duration_seconds integer DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_story_views_completed ON public.story_views(completed);
CREATE INDEX IF NOT EXISTS idx_story_views_duration ON public.story_views(watch_duration_seconds);
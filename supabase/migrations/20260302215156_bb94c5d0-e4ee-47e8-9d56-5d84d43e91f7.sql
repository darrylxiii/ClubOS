
-- Task 1: Add metadata column to funnel_analytics
ALTER TABLE public.funnel_analytics ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Task 5: Add reminder_count column to funnel_partial_submissions
ALTER TABLE public.funnel_partial_submissions ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

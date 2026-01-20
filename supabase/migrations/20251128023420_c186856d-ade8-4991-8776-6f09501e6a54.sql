-- Phase 1 Critical Fix: Add missing column to user_activity_tracking table
-- This column is referenced by update_user_activity_tracking function but was never added

ALTER TABLE public.user_activity_tracking 
ADD COLUMN IF NOT EXISTS total_session_duration_minutes INTEGER DEFAULT 0 NOT NULL;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_user_activity_session_duration 
ON public.user_activity_tracking(total_session_duration_minutes DESC);

-- Update existing rows to have default value
UPDATE public.user_activity_tracking 
SET total_session_duration_minutes = 0 
WHERE total_session_duration_minutes IS NULL;
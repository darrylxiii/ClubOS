-- Add interviewer_ids column to detected_interviews table
ALTER TABLE public.detected_interviews 
ADD COLUMN IF NOT EXISTS interviewer_ids uuid[] DEFAULT '{}';

COMMENT ON COLUMN public.detected_interviews.interviewer_ids IS 'Array of user IDs for interviewers assigned to this interview from job team assignments';
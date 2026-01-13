-- Add AI analysis fields to meeting_recordings table
ALTER TABLE public.meeting_recordings 
ADD COLUMN IF NOT EXISTS transcript text,
ADD COLUMN IF NOT EXISTS ai_analysis jsonb,
ADD COLUMN IF NOT EXISTS follow_up_draft text,
ADD COLUMN IF NOT EXISTS analyzed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS analysis_status text DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed'));
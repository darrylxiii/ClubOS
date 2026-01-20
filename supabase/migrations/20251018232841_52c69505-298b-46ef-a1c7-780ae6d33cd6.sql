-- Add session_token column to meeting_participants for guest identification
ALTER TABLE public.meeting_participants
ADD COLUMN IF NOT EXISTS session_token TEXT;

-- Create index for faster session_token lookups
CREATE INDEX IF NOT EXISTS idx_meeting_participants_session_token 
ON public.meeting_participants(session_token);
-- Fix webrtc_signals table: make sender_id nullable for Live Hub compatibility
ALTER TABLE public.webrtc_signals 
  ALTER COLUMN sender_id DROP NOT NULL;

-- Add status column to user_activity_tracking if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_activity_tracking' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.user_activity_tracking 
      ADD COLUMN status TEXT DEFAULT 'offline';
  END IF;
END $$;

-- Fix meeting_transcripts RLS policy for Live Hub participants (participant_id is TEXT)
DROP POLICY IF EXISTS "Live hub participants can insert transcripts" ON public.meeting_transcripts;

CREATE POLICY "Live hub participants can insert transcripts"
ON public.meeting_transcripts FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND participant_id = auth.uid()::text
);

-- Also allow users to read their own transcripts
DROP POLICY IF EXISTS "Users can read meeting transcripts" ON public.meeting_transcripts;

CREATE POLICY "Users can read meeting transcripts"
ON public.meeting_transcripts FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND participant_id = auth.uid()::text
);
-- Create meeting_clips table for Phase 4 clip creation
CREATE TABLE IF NOT EXISTS public.meeting_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  transcript_excerpt TEXT,
  is_public BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add speaking_metrics column if not exists
ALTER TABLE public.meeting_recordings_extended 
ADD COLUMN IF NOT EXISTS speaking_metrics JSONB;

-- Enable RLS
ALTER TABLE public.meeting_clips ENABLE ROW LEVEL SECURITY;

-- RLS policies for clips
CREATE POLICY "Users can view their own clips" ON public.meeting_clips
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can view public clips" ON public.meeting_clips
FOR SELECT USING (is_public = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Users can create clips" ON public.meeting_clips
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own clips" ON public.meeting_clips
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own clips" ON public.meeting_clips
FOR DELETE USING (created_by = auth.uid());

-- Create index for recording search
CREATE INDEX IF NOT EXISTS idx_recordings_transcript_search 
ON public.meeting_recordings_extended USING gin(to_tsvector('english', COALESCE(transcript, '')));
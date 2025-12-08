-- Phase 1: Create unified meeting_recordings_extended table for TQC Meetings and Live Hub
-- This captures all meeting recordings with full transcripts and AI analysis

CREATE TABLE IF NOT EXISTS public.meeting_recordings_extended (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source references (one of these should be set)
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  live_channel_id UUID REFERENCES public.live_channels(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  
  -- Context references for pipeline integration
  candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  
  -- Recording owner
  host_id UUID NOT NULL,
  
  -- Recording details
  title TEXT,
  recording_url TEXT,
  storage_path TEXT,
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  mime_type TEXT DEFAULT 'video/webm',
  
  -- Recording type
  source_type TEXT NOT NULL DEFAULT 'tqc_meeting' CHECK (source_type IN ('tqc_meeting', 'live_hub', 'conversation_call')),
  
  -- Transcript data
  transcript TEXT,
  transcript_json JSONB, -- Timestamped transcript segments
  
  -- AI Analysis
  ai_analysis JSONB, -- Full analysis (summary, action_items, key_moments, skills, etc.)
  executive_summary TEXT,
  action_items JSONB, -- [{text, owner, deadline, completed}]
  key_moments JSONB, -- [{timestamp, description, importance}]
  skills_assessed JSONB, -- [{skill, score, notes}]
  
  -- Participants info
  participants JSONB, -- [{id, name, role, speaking_time_seconds}]
  
  -- Processing status
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'uploading', 'transcribing', 'analyzing', 'completed', 'failed')),
  processing_error TEXT,
  
  -- Consent
  recording_consent_at TIMESTAMPTZ,
  consent_participants JSONB, -- [{participant_id, consented_at}]
  
  -- Visibility
  is_private BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ, -- Soft delete for admins
  deleted_by UUID,
  
  -- Timestamps
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_extended_meeting_id ON public.meeting_recordings_extended(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_extended_live_channel_id ON public.meeting_recordings_extended(live_channel_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_extended_host_id ON public.meeting_recordings_extended(host_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_extended_candidate_id ON public.meeting_recordings_extended(candidate_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_extended_job_id ON public.meeting_recordings_extended(job_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_extended_processing_status ON public.meeting_recordings_extended(processing_status);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_extended_recorded_at ON public.meeting_recordings_extended(recorded_at DESC);

-- Enable RLS
ALTER TABLE public.meeting_recordings_extended ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can see recordings from meetings they participated in
CREATE POLICY "Users can view recordings they participated in"
  ON public.meeting_recordings_extended
  FOR SELECT
  USING (
    -- Is the recording host
    host_id = auth.uid()
    OR
    -- Is a participant in the linked meeting
    EXISTS (
      SELECT 1 FROM public.meeting_participants mp
      WHERE mp.meeting_id = meeting_recordings_extended.meeting_id
      AND mp.user_id = auth.uid()
    )
    OR
    -- Is admin or strategist (can view all)
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'strategist')
    )
    OR
    -- Is partner viewing recordings from their company's meetings
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.meetings m ON m.id = meeting_recordings_extended.meeting_id
      JOIN public.jobs j ON j.id = m.job_id
      JOIN public.companies c ON c.id = j.company_id
      JOIN public.company_members cm ON cm.company_id = c.id AND cm.user_id = auth.uid()
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'partner'
    )
  );

-- Recording hosts can update their recordings
CREATE POLICY "Hosts can update their recordings"
  ON public.meeting_recordings_extended
  FOR UPDATE
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Anyone can insert recordings (will be used by edge functions)
CREATE POLICY "Service role can insert recordings"
  ON public.meeting_recordings_extended
  FOR INSERT
  WITH CHECK (true);

-- Admins can delete recordings
CREATE POLICY "Admins can delete recordings"
  ON public.meeting_recordings_extended
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_meeting_recordings_extended_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_meeting_recordings_extended_updated_at ON public.meeting_recordings_extended;
CREATE TRIGGER trigger_meeting_recordings_extended_updated_at
  BEFORE UPDATE ON public.meeting_recordings_extended
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_recordings_extended_updated_at();

-- Enable realtime for recordings status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_recordings_extended;
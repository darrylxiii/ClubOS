-- Phase 1: Create meeting-recordings storage bucket and related tables
-- 1.1 Create storage bucket for meeting recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-recordings',
  'meeting-recordings',
  true,
  524288000, -- 500MB limit per file
  ARRAY['video/webm', 'audio/webm', 'video/mp4', 'audio/mp3', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000;

-- 1.2 Storage policies for meeting-recordings bucket
DROP POLICY IF EXISTS "Users can upload their recordings" ON storage.objects;
CREATE POLICY "Users can upload their recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'meeting-recordings' 
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can view recordings they have access to" ON storage.objects;
CREATE POLICY "Users can view recordings they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'meeting-recordings'
);

DROP POLICY IF EXISTS "Users can delete their own recordings" ON storage.objects;
CREATE POLICY "Users can delete their own recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'meeting-recordings'
  AND auth.uid() IS NOT NULL
);

-- 1.3 Add missing columns to meeting_recordings_extended if not exists
ALTER TABLE meeting_recordings_extended 
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transcript_json JSONB,
ADD COLUMN IF NOT EXISTS title TEXT;

-- 1.4 Create candidate_interview_recordings table for profile distribution
CREATE TABLE IF NOT EXISTS candidate_interview_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES meeting_recordings_extended(id) ON DELETE CASCADE,
  meeting_id UUID,
  job_title TEXT,
  company_name TEXT,
  interview_date TIMESTAMPTZ,
  overall_score TEXT,
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE candidate_interview_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view candidate recordings" ON candidate_interview_recordings;
CREATE POLICY "Users can view candidate recordings" ON candidate_interview_recordings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'strategist', 'partner')
  )
  OR candidate_id IN (
    SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
  )
);

-- 1.5 Create job_interview_recordings table for job pipeline distribution
CREATE TABLE IF NOT EXISTS job_interview_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES meeting_recordings_extended(id) ON DELETE CASCADE,
  meeting_id UUID,
  candidate_name TEXT,
  candidate_id UUID,
  interview_stage TEXT,
  overall_score TEXT,
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE job_interview_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view job recordings" ON job_interview_recordings;
CREATE POLICY "Users can view job recordings" ON job_interview_recordings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'strategist', 'partner')
  )
);

-- 1.6 Create unified_tasks table if not exists (for action items from analysis)
CREATE TABLE IF NOT EXISTS unified_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  user_id UUID,
  category TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE unified_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their tasks" ON unified_tasks;
CREATE POLICY "Users can manage their tasks" ON unified_tasks
FOR ALL USING (user_id = auth.uid() OR auth.uid() IN (
  SELECT user_id FROM user_roles WHERE role IN ('admin', 'strategist')
));

-- 1.7 Index for transcript search
CREATE INDEX IF NOT EXISTS idx_recordings_transcript_search 
ON meeting_recordings_extended 
USING gin(to_tsvector('english', COALESCE(transcript, '')));
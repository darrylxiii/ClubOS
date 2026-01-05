-- Add missing columns to meeting_templates
ALTER TABLE meeting_templates ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE meeting_templates ADD COLUMN IF NOT EXISTS question_bank JSONB DEFAULT '[]';
ALTER TABLE meeting_templates ADD COLUMN IF NOT EXISTS scoring_rubric JSONB DEFAULT '{}';
ALTER TABLE meeting_templates ADD COLUMN IF NOT EXISTS time_allocation_minutes INTEGER DEFAULT 60;
ALTER TABLE meeting_templates ADD COLUMN IF NOT EXISTS stages JSONB DEFAULT '[]';
ALTER TABLE meeting_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Meeting dossiers
CREATE TABLE IF NOT EXISTS meeting_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  recording_id UUID,
  candidate_id UUID,
  generated_by UUID REFERENCES auth.users(id),
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  pdf_url TEXT,
  share_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  watermark_text TEXT,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Meeting engagement metrics
CREATE TABLE IF NOT EXISTS meeting_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  participant_id UUID,
  speaking_time_seconds INTEGER DEFAULT 0,
  average_response_latency_ms INTEGER,
  sentiment_shifts JSONB DEFAULT '[]',
  engagement_score NUMERIC(5,2),
  attention_indicators JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- AI highlight clips enhancement
ALTER TABLE meeting_clips ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE meeting_clips ADD COLUMN IF NOT EXISTS highlight_type TEXT;
ALTER TABLE meeting_clips ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
ALTER TABLE meeting_clips ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2);

-- Translation and template preferences
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS translation_enabled BOOLEAN DEFAULT false;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS translation_languages TEXT[] DEFAULT '{}';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES meeting_templates(id);

-- RLS policies for meeting_dossiers
ALTER TABLE meeting_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dossiers they generated" ON meeting_dossiers
  FOR SELECT USING (auth.uid() = generated_by);

CREATE POLICY "Users can view dossiers for meetings they host" ON meeting_dossiers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM meetings WHERE id = meeting_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can create dossiers for their meetings" ON meeting_dossiers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM meetings WHERE id = meeting_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can update their dossiers" ON meeting_dossiers
  FOR UPDATE USING (auth.uid() = generated_by);

-- RLS policies for meeting_engagement_metrics
ALTER TABLE meeting_engagement_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view engagement for their meetings" ON meeting_engagement_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM meetings WHERE id = meeting_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can insert engagement metrics" ON meeting_engagement_metrics
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM meetings WHERE id = meeting_id AND host_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_meeting_id ON meeting_dossiers(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_share_token ON meeting_dossiers(share_token);
CREATE INDEX IF NOT EXISTS idx_meeting_engagement_meeting_id ON meeting_engagement_metrics(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_clips_ai_generated ON meeting_clips(ai_generated) WHERE ai_generated = true;
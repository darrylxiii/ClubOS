-- Phase 5: Real-Time Meeting Intelligence

-- Meeting agenda items for tracking
CREATE TABLE IF NOT EXISTS meeting_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  item_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  allocated_minutes INTEGER,
  actual_minutes INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
  notes TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Real-time engagement samples (high-frequency data)
CREATE TABLE IF NOT EXISTS meeting_engagement_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  participant_id TEXT NOT NULL,
  sample_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),
  sentiment_score NUMERIC CHECK (sentiment_score BETWEEN -1 AND 1),
  speaking_detected BOOLEAN DEFAULT false,
  attention_indicator TEXT CHECK (attention_indicator IN ('focused', 'distracted', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_agenda_items_meeting ON meeting_agenda_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_agenda_items_order ON meeting_agenda_items(meeting_id, item_order);
CREATE INDEX IF NOT EXISTS idx_engagement_samples_meeting ON meeting_engagement_samples(meeting_id);
CREATE INDEX IF NOT EXISTS idx_engagement_samples_timestamp ON meeting_engagement_samples(sample_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_samples_participant ON meeting_engagement_samples(meeting_id, participant_id);

-- Enable RLS
ALTER TABLE meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_engagement_samples ENABLE ROW LEVEL SECURITY;

-- RLS for meeting_agenda_items
CREATE POLICY "Meeting participants can view agenda"
  ON meeting_agenda_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_agenda_items.meeting_id
      AND (m.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM meeting_participants mp 
        WHERE mp.meeting_id = m.id AND mp.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Host can manage agenda"
  ON meeting_agenda_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_agenda_items.meeting_id
      AND m.host_id = auth.uid()
    )
  );

-- RLS for meeting_engagement_samples
CREATE POLICY "Meeting host can view engagement"
  ON meeting_engagement_samples FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_engagement_samples.meeting_id
      AND m.host_id = auth.uid()
    )
  );

CREATE POLICY "System can insert engagement samples"
  ON meeting_engagement_samples FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_meeting_agenda_items_updated_at
  BEFORE UPDATE ON meeting_agenda_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
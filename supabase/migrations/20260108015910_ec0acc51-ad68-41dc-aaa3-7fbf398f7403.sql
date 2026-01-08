-- External Context Imports Table
-- Stores imported call recordings, WhatsApp exports, LinkedIn messages, etc.
CREATE TABLE IF NOT EXISTS external_context_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content identification
  content_type text NOT NULL CHECK (content_type IN ('call_recording', 'whatsapp_export', 'linkedin_export', 'email_thread', 'meeting_notes', 'document', 'other')),
  title text NOT NULL,
  description text,
  
  -- File storage
  file_url text,
  file_name text,
  file_size_kb integer,
  mime_type text,
  
  -- Entity linking (polymorphic)
  entity_type text NOT NULL CHECK (entity_type IN ('candidate', 'company', 'user', 'prospect', 'job', 'application')),
  entity_id uuid NOT NULL,
  secondary_entity_type text CHECK (secondary_entity_type IN ('candidate', 'company', 'user', 'prospect', 'job', 'application', NULL)),
  secondary_entity_id uuid,
  
  -- Content extraction
  raw_content text,
  parsed_content jsonb,
  ai_summary text,
  action_items jsonb DEFAULT '[]'::jsonb,
  key_topics text[] DEFAULT '{}',
  
  -- Sentiment & Intelligence
  sentiment_score decimal(3,2),
  sentiment_label text CHECK (sentiment_label IN ('positive', 'neutral', 'negative', NULL)),
  urgency_level text DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'urgent')),
  
  -- Source metadata
  source_platform text,
  original_date timestamptz,
  duration_minutes integer,
  participants jsonb DEFAULT '[]'::jsonb,
  
  -- Processing status
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'transcribing', 'analyzing', 'completed', 'failed')),
  transcription_status text,
  analysis_status text,
  error_message text,
  
  -- Audit
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_external_imports_entity ON external_context_imports(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_external_imports_secondary ON external_context_imports(secondary_entity_type, secondary_entity_id);
CREATE INDEX IF NOT EXISTS idx_external_imports_type ON external_context_imports(content_type);
CREATE INDEX IF NOT EXISTS idx_external_imports_status ON external_context_imports(processing_status);
CREATE INDEX IF NOT EXISTS idx_external_imports_uploaded_by ON external_context_imports(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_external_imports_date ON external_context_imports(original_date DESC);

-- RLS: Strategists and admins can manage imports
ALTER TABLE external_context_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view imports they uploaded"
  ON external_context_imports FOR SELECT
  USING (uploaded_by = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  ));

CREATE POLICY "Strategists and admins can insert imports"
  ON external_context_imports FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  ));

CREATE POLICY "Strategists and admins can update imports"
  ON external_context_imports FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  ));

CREATE POLICY "Admins can delete imports"
  ON external_context_imports FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_external_context_imports_updated_at
  BEFORE UPDATE ON external_context_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to queue imports for processing
CREATE OR REPLACE FUNCTION queue_external_import_for_processing()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO intelligence_queue (
    entity_type, entity_id, processing_type, priority
  ) VALUES (
    'external_context_imports', NEW.id, 'process_import', 8
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_external_import_processing
  AFTER INSERT ON external_context_imports
  FOR EACH ROW
  EXECUTE FUNCTION queue_external_import_for_processing();

-- Create storage bucket for external imports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'external-imports',
  'external-imports',
  false,
  524288000, -- 500MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg', 'video/mp4', 'video/webm', 'text/plain', 'application/json', 'application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for external-imports bucket
CREATE POLICY "Strategists can upload external imports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'external-imports' AND
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Users can view their external imports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'external-imports' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR 
     EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')))
  );

CREATE POLICY "Strategists can update external imports"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'external-imports' AND
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admins can delete external imports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'external-imports' AND
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
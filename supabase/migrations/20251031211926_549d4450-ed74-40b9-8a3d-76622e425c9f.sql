-- Create emails table (unified inbox)
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  
  -- Email metadata
  external_id TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails JSONB NOT NULL,
  cc_emails JSONB,
  bcc_emails JSONB,
  reply_to TEXT,
  
  -- Content
  body_text TEXT,
  body_html TEXT,
  snippet TEXT,
  
  -- Status & organization
  status TEXT NOT NULL DEFAULT 'inbox',
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE,
  
  -- AI-powered features
  ai_category TEXT,
  ai_priority INTEGER,
  ai_summary TEXT,
  ai_sentiment TEXT,
  ai_action_items JSONB,
  ai_processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Quantum Club features
  assigned_to UUID REFERENCES auth.users(id),
  snoozed_until TIMESTAMP WITH TIME ZONE,
  reminder_at TIMESTAMP WITH TIME ZONE,
  
  -- Attachments
  has_attachments BOOLEAN DEFAULT FALSE,
  attachment_count INTEGER DEFAULT 0,
  
  -- Timestamps
  email_date TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Metadata
  raw_headers JSONB,
  metadata JSONB,
  
  UNIQUE(connection_id, external_id)
);

-- Email attachments
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  mime_type TEXT,
  content_id TEXT,
  external_id TEXT,
  storage_path TEXT,
  is_inline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email labels
CREATE TABLE IF NOT EXISTS email_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  type TEXT DEFAULT 'user',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Email-label junction
CREATE TABLE IF NOT EXISTS email_label_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES email_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(email_id, label_id)
);

-- Email drafts
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES email_connections(id) ON DELETE SET NULL,
  reply_to_email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
  
  to_emails JSONB NOT NULL,
  cc_emails JSONB,
  bcc_emails JSONB,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  
  attachments JSONB,
  
  ai_template_used TEXT,
  ai_tone TEXT,
  ai_suggestions JSONB,
  
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email sync log
CREATE TABLE IF NOT EXISTS email_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  sync_type TEXT,
  status TEXT,
  emails_fetched INTEGER DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_user_status ON emails(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(email_date DESC);
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(ai_category);
CREATE INDEX IF NOT EXISTS idx_emails_snoozed ON emails(snoozed_until) WHERE snoozed_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_unread ON emails(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_email_attachments_email ON email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_labels_user ON email_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_email_label_mappings_email ON email_label_mappings(email_id);
CREATE INDEX IF NOT EXISTS idx_email_label_mappings_label ON email_label_mappings(label_id);

-- Enable RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_label_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emails
CREATE POLICY "Users can view own emails"
  ON emails FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own emails"
  ON emails FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own emails"
  ON emails FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own emails"
  ON emails FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for email_attachments
CREATE POLICY "Users can view attachments of own emails"
  ON email_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments for own emails"
  ON email_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

-- RLS Policies for email_labels
CREATE POLICY "Users can view own labels"
  ON email_labels FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own labels"
  ON email_labels FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own labels"
  ON email_labels FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own labels"
  ON email_labels FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for email_label_mappings
CREATE POLICY "Users can view own email label mappings"
  ON email_label_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_label_mappings.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own email label mappings"
  ON email_label_mappings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_label_mappings.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own email label mappings"
  ON email_label_mappings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_label_mappings.email_id 
      AND emails.user_id = auth.uid()
    )
  );

-- RLS Policies for email_drafts
CREATE POLICY "Users can manage own drafts"
  ON email_drafts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for email_sync_log
CREATE POLICY "Users can view sync logs for own connections"
  ON email_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_connections 
      WHERE email_connections.id = email_sync_log.connection_id 
      AND email_connections.user_id = auth.uid()
    )
  );

-- Function to create default labels for new users
CREATE OR REPLACE FUNCTION create_default_email_labels()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_labels (user_id, name, color, icon, type, sort_order) VALUES
  (NEW.id, 'Hot Leads', '#EF4444', 'Flame', 'system', 1),
  (NEW.id, 'Interviews', '#F59E0B', 'Calendar', 'system', 2),
  (NEW.id, 'Offers', '#10B981', 'Briefcase', 'system', 3),
  (NEW.id, 'Networking', '#3B82F6', 'Users', 'system', 4),
  (NEW.id, 'Newsletters', '#6B7280', 'Newspaper', 'system', 5),
  (NEW.id, 'Follow Up', '#8B5CF6', 'Clock', 'system', 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default labels for new users
CREATE TRIGGER create_default_email_labels_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_email_labels();

-- Enable realtime for emails table
ALTER PUBLICATION supabase_realtime ADD TABLE emails;
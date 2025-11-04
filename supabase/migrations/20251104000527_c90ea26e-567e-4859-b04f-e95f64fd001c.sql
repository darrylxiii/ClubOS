-- Add AI priority scoring and inbox segmentation
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ai_priority_score INTEGER DEFAULT 50;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ai_priority_reason TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS inbox_type TEXT DEFAULT 'primary';

-- Create email threads table for conversation grouping
CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  subject TEXT,
  participant_emails JSONB DEFAULT '[]'::jsonb,
  message_count INTEGER DEFAULT 1,
  ai_thread_summary TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, thread_id)
);

-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  avg_response_time_hours NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  search_query TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_threads
CREATE POLICY "Users can view their own threads" ON email_threads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own threads" ON email_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads" ON email_threads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads" ON email_threads
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for email_templates
CREATE POLICY "Users can view their own templates" ON email_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" ON email_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON email_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON email_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for saved_searches
CREATE POLICY "Users can view their own saved searches" ON saved_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches" ON saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches" ON saved_searches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches" ON saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_priority_score ON emails(ai_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_emails_inbox_type ON emails(inbox_type);
CREATE INDEX IF NOT EXISTS idx_email_threads_user_thread ON email_threads(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_user ON email_templates(user_id) WHERE is_active = true;
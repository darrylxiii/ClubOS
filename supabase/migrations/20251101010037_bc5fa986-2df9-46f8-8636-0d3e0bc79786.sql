-- Phase 1: Create AI Action & Intelligence Tables

-- AI action log (track all AI-performed actions)
CREATE TABLE IF NOT EXISTS ai_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_action_log_user_id ON ai_action_log(user_id);
CREATE INDEX idx_ai_action_log_created_at ON ai_action_log(created_at);
CREATE INDEX idx_ai_action_log_action_type ON ai_action_log(action_type);

-- AI suggestions/nudges
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  action_data JSONB DEFAULT '{}'::jsonb,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  shown BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  acted_upon BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_created_at ON ai_suggestions(created_at);
CREATE INDEX idx_ai_suggestions_priority ON ai_suggestions(priority);
CREATE INDEX idx_ai_suggestions_shown ON ai_suggestions(shown) WHERE shown = false;

-- AI generated content cache
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  prompt TEXT,
  generated_content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  used BOOLEAN DEFAULT false,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_generated_content_user_id ON ai_generated_content(user_id);
CREATE INDEX idx_ai_generated_content_created_at ON ai_generated_content(created_at);
CREATE INDEX idx_ai_generated_content_type ON ai_generated_content(content_type);

-- Enable RLS
ALTER TABLE ai_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_action_log
CREATE POLICY "Users can view their own action logs"
  ON ai_action_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action logs"
  ON ai_action_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_suggestions
CREATE POLICY "Users can view their own suggestions"
  ON ai_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON ai_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert suggestions"
  ON ai_suggestions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for ai_generated_content
CREATE POLICY "Users can view their own generated content"
  ON ai_generated_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated content"
  ON ai_generated_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated content"
  ON ai_generated_content FOR UPDATE
  USING (auth.uid() = user_id);
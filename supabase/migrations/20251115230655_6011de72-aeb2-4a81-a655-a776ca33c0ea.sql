-- Create translations storage table
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL,
  language text NOT NULL,
  translations jsonb NOT NULL,
  version int DEFAULT 1,
  generated_at timestamptz DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(namespace, language, version)
);

-- Create language configuration table
CREATE TABLE IF NOT EXISTS language_config (
  code text PRIMARY KEY,
  name text NOT NULL,
  native_name text NOT NULL,
  flag_emoji text NOT NULL,
  is_rtl boolean DEFAULT false,
  font_family text,
  is_active boolean DEFAULT true,
  added_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Create translation feedback table for quality monitoring
CREATE TABLE IF NOT EXISTS translation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL,
  language text NOT NULL,
  translation_key text NOT NULL,
  issue_type text NOT NULL,
  user_comment text,
  reported_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_translations_namespace_lang ON translations(namespace, language) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_translations_active ON translations(is_active, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_language_config_active ON language_config(is_active);
CREATE INDEX IF NOT EXISTS idx_translation_feedback_status ON translation_feedback(status, created_at DESC);

-- Enable RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for translations table
CREATE POLICY "Anyone can read active translations"
  ON translations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can insert translations"
  ON translations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their translations"
  ON translations FOR UPDATE
  USING (auth.uid() = generated_by);

-- RLS Policies for language_config table
CREATE POLICY "Anyone can read active languages"
  ON language_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can insert languages"
  ON language_config FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update languages"
  ON language_config FOR UPDATE
  USING (auth.role() = 'authenticated');

-- RLS Policies for translation_feedback table
CREATE POLICY "Users can read their own feedback"
  ON translation_feedback FOR SELECT
  USING (auth.uid() = reported_by OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert feedback"
  ON translation_feedback FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their feedback status"
  ON translation_feedback FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Seed language_config with current 8 languages
INSERT INTO language_config (code, name, native_name, flag_emoji, is_rtl, font_family) VALUES
  ('en', 'English', 'English', '🇬🇧', false, null),
  ('nl', 'Dutch', 'Nederlands', '🇳🇱', false, null),
  ('de', 'German', 'Deutsch', '🇩🇪', false, null),
  ('fr', 'French', 'Français', '🇫🇷', false, null),
  ('es', 'Spanish', 'Español', '🇪🇸', false, null),
  ('zh', 'Chinese', '中文', '🇨🇳', false, 'Noto Sans SC'),
  ('ar', 'Arabic', 'العربية', '🇸🇦', true, 'Cairo'),
  ('ru', 'Russian', 'Русский', '🇷🇺', false, null)
ON CONFLICT (code) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_translations_updated_at
  BEFORE UPDATE ON translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_language_config_updated_at
  BEFORE UPDATE ON language_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
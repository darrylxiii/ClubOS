
-- Activity samples for granular tracking (stores per-minute activity data)
CREATE TABLE public.activity_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  mouse_events INTEGER NOT NULL DEFAULT 0,
  keyboard_events INTEGER NOT NULL DEFAULT 0,
  activity_percentage INTEGER NOT NULL DEFAULT 0 CHECK (activity_percentage >= 0 AND activity_percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Screenshots table (optional privacy-first feature)
CREATE TABLE public.time_tracking_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  capture_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  activity_level INTEGER CHECK (activity_level >= 0 AND activity_level <= 100),
  is_blurred BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- App/URL usage tracking
CREATE TABLE public.app_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  app_name TEXT NOT NULL,
  window_title TEXT,
  url TEXT,
  domain TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'neutral' CHECK (category IN ('productive', 'communication', 'neutral', 'distracting')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Privacy settings per user
CREATE TABLE public.productivity_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  activity_tracking_enabled BOOLEAN NOT NULL DEFAULT true,
  screenshots_enabled BOOLEAN NOT NULL DEFAULT false,
  screenshot_interval_minutes INTEGER NOT NULL DEFAULT 10 CHECK (screenshot_interval_minutes IN (5, 10, 15)),
  screenshot_blur_level TEXT NOT NULL DEFAULT 'partial' CHECK (screenshot_blur_level IN ('none', 'partial', 'full')),
  app_monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
  url_tracking_enabled BOOLEAN NOT NULL DEFAULT true,
  data_retention_days INTEGER NOT NULL DEFAULT 30 CHECK (data_retention_days IN (30, 60, 90)),
  domain_whitelist TEXT[] DEFAULT '{}',
  domain_blacklist TEXT[] DEFAULT '{}',
  consent_given_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- App categories for automatic classification
CREATE TABLE public.app_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('productive', 'communication', 'neutral', 'distracting')),
  patterns TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_activity_samples_time_entry ON public.activity_samples(time_entry_id);
CREATE INDEX idx_activity_samples_user_timestamp ON public.activity_samples(user_id, timestamp DESC);
CREATE INDEX idx_screenshots_time_entry ON public.time_tracking_screenshots(time_entry_id);
CREATE INDEX idx_screenshots_user_expires ON public.time_tracking_screenshots(user_id, expires_at);
CREATE INDEX idx_app_usage_time_entry ON public.app_usage_tracking(time_entry_id);
CREATE INDEX idx_app_usage_user_timestamp ON public.app_usage_tracking(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE public.activity_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_samples
CREATE POLICY "Users can view own activity samples"
ON public.activity_samples FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity samples"
ON public.activity_samples FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity samples"
ON public.activity_samples FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for screenshots
CREATE POLICY "Users can view own screenshots"
ON public.time_tracking_screenshots FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own screenshots"
ON public.time_tracking_screenshots FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own screenshots"
ON public.time_tracking_screenshots FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for app_usage_tracking
CREATE POLICY "Users can view own app usage"
ON public.app_usage_tracking FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own app usage"
ON public.app_usage_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own app usage"
ON public.app_usage_tracking FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for privacy_settings
CREATE POLICY "Users can view own privacy settings"
ON public.productivity_privacy_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
ON public.productivity_privacy_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
ON public.productivity_privacy_settings FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for app_categories (readable by all authenticated, editable by admins)
CREATE POLICY "Anyone can view app categories"
ON public.app_categories FOR SELECT
TO authenticated
USING (true);

-- Seed default app categories
INSERT INTO public.app_categories (name, category, patterns, is_system) VALUES
('VS Code', 'productive', ARRAY['vscode', 'visual studio code'], true),
('GitHub', 'productive', ARRAY['github.com', 'github'], true),
('Figma', 'productive', ARRAY['figma.com', 'figma'], true),
('Notion', 'productive', ARRAY['notion.so', 'notion'], true),
('Jira', 'productive', ARRAY['jira', 'atlassian.net/jira'], true),
('Linear', 'productive', ARRAY['linear.app', 'linear'], true),
('Slack', 'communication', ARRAY['slack.com', 'slack'], true),
('Microsoft Teams', 'communication', ARRAY['teams.microsoft.com', 'teams'], true),
('Gmail', 'communication', ARRAY['mail.google.com', 'gmail'], true),
('Zoom', 'communication', ARRAY['zoom.us', 'zoom'], true),
('Discord', 'communication', ARRAY['discord.com', 'discord'], true),
('Google Search', 'neutral', ARRAY['google.com/search'], true),
('Stack Overflow', 'neutral', ARRAY['stackoverflow.com'], true),
('Wikipedia', 'neutral', ARRAY['wikipedia.org'], true),
('Twitter/X', 'distracting', ARRAY['twitter.com', 'x.com'], true),
('Facebook', 'distracting', ARRAY['facebook.com'], true),
('Instagram', 'distracting', ARRAY['instagram.com'], true),
('YouTube', 'distracting', ARRAY['youtube.com'], true),
('TikTok', 'distracting', ARRAY['tiktok.com'], true),
('Reddit', 'distracting', ARRAY['reddit.com'], true);

-- Function to update activity_level on time_entries as weighted average
CREATE OR REPLACE FUNCTION update_time_entry_activity_level()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.time_entries
  SET activity_level = (
    SELECT ROUND(AVG(activity_percentage))::TEXT
    FROM public.activity_samples
    WHERE time_entry_id = NEW.time_entry_id
  )
  WHERE id = NEW.time_entry_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update activity_level
CREATE TRIGGER trigger_update_activity_level
AFTER INSERT ON public.activity_samples
FOR EACH ROW
EXECUTE FUNCTION update_time_entry_activity_level();

-- Function to auto-create privacy settings on first use
CREATE OR REPLACE FUNCTION ensure_privacy_settings()
RETURNS UUID AS $$
DECLARE
  settings_id UUID;
BEGIN
  SELECT id INTO settings_id
  FROM public.productivity_privacy_settings
  WHERE user_id = auth.uid();
  
  IF settings_id IS NULL THEN
    INSERT INTO public.productivity_privacy_settings (user_id)
    VALUES (auth.uid())
    RETURNING id INTO settings_id;
  END IF;
  
  RETURN settings_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

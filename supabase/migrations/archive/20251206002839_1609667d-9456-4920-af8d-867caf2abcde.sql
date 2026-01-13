-- Web KPI Metrics table (unified storage for all web KPIs)
CREATE TABLE IF NOT EXISTS web_kpi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('north_star', 'funnel', 'attribution', 'ai_insights', 'retention', 'google_signals')),
  kpi_name TEXT NOT NULL,
  value NUMERIC,
  target_value NUMERIC,
  threshold_warning NUMERIC,
  threshold_critical NUMERIC,
  period_type TEXT DEFAULT 'daily' CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
  period_date DATE,
  trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
  trend_percentage NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad Campaigns table (Google Ads, LinkedIn, Meta integration)
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  ad_platform TEXT DEFAULT 'google' CHECK (ad_platform IN ('google', 'linkedin', 'meta', 'other')),
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend NUMERIC(10,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  brand_impressions INTEGER DEFAULT 0,
  non_brand_impressions INTEGER DEFAULT 0,
  ctr NUMERIC(5,4),
  cpc NUMERIC(8,2),
  gclid_capture_count INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

-- Lead Scores table (SQL qualification tracking)
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_request_id UUID,
  session_id TEXT,
  lead_score INTEGER CHECK (lead_score BETWEEN 0 AND 100),
  is_sql BOOLEAN GENERATED ALWAYS AS (lead_score >= 70) STORED,
  scoring_factors JSONB DEFAULT '{}',
  source_channel TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  time_to_qualify_hours NUMERIC,
  qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content AI Scores table (GPT-4o analysis)
CREATE TABLE IF NOT EXISTS content_ai_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  page_title TEXT,
  content_clarity_score NUMERIC(3,1) CHECK (content_clarity_score BETWEEN 0 AND 10),
  emotional_sentiment TEXT CHECK (emotional_sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  sentiment_score NUMERIC(4,2) CHECK (sentiment_score BETWEEN -1 AND 1),
  heat_trigger_ratio NUMERIC(5,2),
  readability_grade NUMERIC(4,1),
  word_count INTEGER,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analysis_model TEXT DEFAULT 'gpt-4o',
  analysis_details JSONB DEFAULT '{}',
  improvement_suggestions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Web Performance Metrics table (Core Web Vitals)
CREATE TABLE IF NOT EXISTS web_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  page_path TEXT,
  lcp_ms NUMERIC,
  fid_ms NUMERIC,
  cls_score NUMERIC,
  inp_ms NUMERIC,
  ttfb_ms NUMERIC,
  fcp_ms NUMERIC,
  cwv_pass BOOLEAN,
  sample_count INTEGER DEFAULT 1,
  p75_lcp NUMERIC,
  p75_fid NUMERIC,
  p75_cls NUMERIC,
  lighthouse_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, page_path)
);

-- Enable RLS
ALTER TABLE web_kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ai_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin/Strategist access
CREATE POLICY "Admins can manage web_kpi_metrics" ON web_kpi_metrics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admins can manage ad_campaigns" ON ad_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admins can manage lead_scores" ON lead_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admins can manage content_ai_scores" ON content_ai_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admins can manage web_performance_metrics" ON web_performance_metrics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_web_kpi_metrics_category_date ON web_kpi_metrics(category, period_date);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_date ON ad_campaigns(date);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_platform ON ad_campaigns(ad_platform);
CREATE INDEX IF NOT EXISTS idx_lead_scores_is_sql ON lead_scores(is_sql);
CREATE INDEX IF NOT EXISTS idx_lead_scores_source ON lead_scores(source_channel);
CREATE INDEX IF NOT EXISTS idx_content_ai_scores_path ON content_ai_scores(page_path);
CREATE INDEX IF NOT EXISTS idx_web_performance_date ON web_performance_metrics(date);

-- Function to update web_kpi_metrics timestamp
CREATE OR REPLACE FUNCTION update_web_kpi_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_web_kpi_metrics_timestamp
  BEFORE UPDATE ON web_kpi_metrics
  FOR EACH ROW EXECUTE FUNCTION update_web_kpi_timestamp();
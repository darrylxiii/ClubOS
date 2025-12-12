-- =====================================================
-- ENTERPRISE EMAIL SEQUENCING INTELLIGENCE SYSTEM
-- $100M Plan - Complete Database Schema
-- =====================================================

-- Phase 4: Lead Predictions
CREATE TABLE IF NOT EXISTS crm_lead_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES crm_prospects(id) ON DELETE CASCADE,
  conversion_probability NUMERIC(5,2) CHECK (conversion_probability BETWEEN 0 AND 100),
  confidence_interval NUMERIC(5,2),
  feature_importance JSONB DEFAULT '{}',
  recommended_action TEXT,
  optimal_contact_time TIMESTAMPTZ,
  prediction_model_version TEXT DEFAULT 'v1.0',
  engagement_velocity NUMERIC(5,2),
  response_pattern JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_predictions_prospect ON crm_lead_predictions(prospect_id);
CREATE INDEX idx_lead_predictions_probability ON crm_lead_predictions(conversion_probability DESC);

-- Phase 5: Account Health Monitoring
CREATE TABLE IF NOT EXISTS instantly_account_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100) DEFAULT 100,
  warmup_status TEXT DEFAULT 'unknown',
  warmup_progress INTEGER DEFAULT 0,
  inbox_placement_rate NUMERIC(5,2) DEFAULT 100,
  spam_rate NUMERIC(5,2) DEFAULT 0,
  bounce_rate NUMERIC(5,2) DEFAULT 0,
  daily_limit INTEGER DEFAULT 50,
  emails_sent_today INTEGER DEFAULT 0,
  domain TEXT,
  is_connected BOOLEAN DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  alerts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_account_health_score ON instantly_account_health(health_score);
CREATE INDEX idx_account_health_domain ON instantly_account_health(domain);

-- Phase 6: A/B Testing
CREATE TABLE IF NOT EXISTS crm_ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_type TEXT CHECK (variant_type IN ('subject', 'body', 'cta', 'send_time')),
  content TEXT NOT NULL,
  sends INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  reply_rate NUMERIC(5,2) DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  statistical_significance NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ab_variants_campaign ON crm_ab_test_variants(campaign_id);

CREATE TABLE IF NOT EXISTS crm_ab_test_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL,
  insight_content TEXT NOT NULL,
  applicable_segments JSONB DEFAULT '{}',
  confidence_score NUMERIC(5,2),
  sample_size INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 7: Send Time Analytics
CREATE TABLE IF NOT EXISTS instantly_send_time_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  hour_of_day INTEGER CHECK (hour_of_day BETWEEN 0 AND 23),
  timezone TEXT DEFAULT 'UTC',
  total_sent INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  reply_rate NUMERIC(5,2) DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_send_time_campaign ON instantly_send_time_analytics(campaign_id);
CREATE INDEX idx_send_time_day_hour ON instantly_send_time_analytics(day_of_week, hour_of_day);

-- Phase 9: Campaign Benchmarks
CREATE TABLE IF NOT EXISTS crm_campaign_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  company_size TEXT,
  campaign_type TEXT DEFAULT 'cold_outreach',
  avg_open_rate NUMERIC(5,2) DEFAULT 0,
  avg_reply_rate NUMERIC(5,2) DEFAULT 0,
  avg_conversion_rate NUMERIC(5,2) DEFAULT 0,
  avg_bounce_rate NUMERIC(5,2) DEFAULT 0,
  avg_unsubscribe_rate NUMERIC(5,2) DEFAULT 0,
  sample_campaigns INTEGER DEFAULT 0,
  top_performer_open_rate NUMERIC(5,2) DEFAULT 0,
  top_performer_reply_rate NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_benchmarks_industry ON crm_campaign_benchmarks(industry);

-- Campaign ROI Tracking
CREATE TABLE IF NOT EXISTS crm_campaign_roi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  total_leads INTEGER DEFAULT 0,
  cost_per_lead NUMERIC(10,2) DEFAULT 0,
  total_meetings INTEGER DEFAULT 0,
  cost_per_meeting NUMERIC(10,2) DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  cost_per_conversion NUMERIC(10,2) DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(10,2) DEFAULT 0,
  roi_percentage NUMERIC(8,2) DEFAULT 0,
  attribution_model TEXT DEFAULT 'first_touch',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_roi ON crm_campaign_roi(campaign_id);

-- AI Insights for Outreach
CREATE TABLE IF NOT EXISTS crm_outreach_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL,
  insight_title TEXT NOT NULL,
  insight_content TEXT NOT NULL,
  recommendations JSONB DEFAULT '[]',
  affected_campaigns JSONB DEFAULT '[]',
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical', 'positive')),
  is_actionable BOOLEAN DEFAULT TRUE,
  is_read BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outreach_insights_type ON crm_outreach_insights(insight_type);
CREATE INDEX idx_outreach_insights_severity ON crm_outreach_insights(severity);

-- Enable RLS
ALTER TABLE crm_lead_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE instantly_account_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ab_test_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE instantly_send_time_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_roi ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_outreach_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin and strategists can manage lead predictions" ON crm_lead_predictions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admin and strategists can manage account health" ON instantly_account_health
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admin and strategists can manage AB tests" ON crm_ab_test_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admin and strategists can view AB insights" ON crm_ab_test_insights
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admin and strategists can manage send time analytics" ON instantly_send_time_analytics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admin and strategists can view benchmarks" ON crm_campaign_benchmarks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admin and strategists can manage campaign ROI" ON crm_campaign_roi
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admin and strategists can manage outreach insights" ON crm_outreach_insights
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

-- Seed initial benchmark data
INSERT INTO crm_campaign_benchmarks (industry, company_size, avg_open_rate, avg_reply_rate, avg_conversion_rate, sample_campaigns)
VALUES 
  ('Technology', 'Enterprise', 22.5, 3.2, 0.8, 1500),
  ('Technology', 'Mid-Market', 28.1, 4.5, 1.2, 2300),
  ('Technology', 'SMB', 35.2, 6.8, 2.1, 3200),
  ('Finance', 'Enterprise', 18.3, 2.1, 0.5, 800),
  ('Finance', 'Mid-Market', 24.6, 3.8, 1.0, 1100),
  ('Healthcare', 'Enterprise', 20.1, 2.8, 0.7, 600),
  ('Healthcare', 'Mid-Market', 26.4, 4.2, 1.3, 900),
  ('Professional Services', 'All', 31.5, 5.6, 1.8, 2100),
  ('SaaS', 'All', 29.8, 5.2, 1.6, 4500),
  ('E-commerce', 'All', 33.2, 6.1, 2.0, 1800)
ON CONFLICT DO NOTHING;
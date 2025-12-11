-- Add Instantly-specific columns to crm_prospects
ALTER TABLE crm_prospects ADD COLUMN IF NOT EXISTS instantly_lead_id TEXT;
ALTER TABLE crm_prospects ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ;
ALTER TABLE crm_prospects ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMPTZ;
ALTER TABLE crm_prospects ADD COLUMN IF NOT EXISTS last_replied_at TIMESTAMPTZ;
ALTER TABLE crm_prospects ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;
ALTER TABLE crm_prospects ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;
ALTER TABLE crm_prospects ADD COLUMN IF NOT EXISTS is_interested BOOLEAN DEFAULT false;
ALTER TABLE crm_prospects ADD COLUMN IF NOT EXISTS interest_indicated_at TIMESTAMPTZ;
ALTER TABLE crm_prospects ADD COLUMN IF NOT EXISTS meeting_booked_at TIMESTAMPTZ;
ALTER TABLE crm_prospects ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Add sync columns to crm_campaigns
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS leads_count INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_sent INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_opened INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_clicked INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_replied INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_bounced INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_unsubscribed INTEGER DEFAULT 0;

-- Create webhook logs table
CREATE TABLE IF NOT EXISTS instantly_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create sync logs table
CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  source TEXT NOT NULL,
  direction TEXT,
  total_records INTEGER DEFAULT 0,
  synced_records INTEGER DEFAULT 0,
  created_records INTEGER DEFAULT 0,
  updated_records INTEGER DEFAULT 0,
  pushed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  errors JSONB,
  triggered_by UUID,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create email threads table
CREATE TABLE IF NOT EXISTS crm_email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES crm_prospects(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES crm_campaigns(id) ON DELETE SET NULL,
  instantly_thread_id TEXT,
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prospect_id, campaign_id)
);

-- Create integration settings table
CREATE TABLE IF NOT EXISTS crm_integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(integration, setting_key)
);

-- Create analytics snapshots table
CREATE TABLE IF NOT EXISTS crm_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type TEXT NOT NULL,
  data JSONB NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_crm_prospects_instantly_lead_id ON crm_prospects(instantly_lead_id) WHERE instantly_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instantly_webhook_logs_processed ON instantly_webhook_logs(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_type ON crm_sync_logs(sync_type, source, created_at);

-- Enable RLS
ALTER TABLE instantly_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies - admin access
CREATE POLICY "Admin access to webhook logs" ON instantly_webhook_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

CREATE POLICY "Admin access to sync logs" ON crm_sync_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

CREATE POLICY "Users can view their email threads" ON crm_email_threads FOR SELECT USING (
  EXISTS (SELECT 1 FROM crm_prospects WHERE crm_prospects.id = prospect_id AND crm_prospects.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

CREATE POLICY "Users can manage their email threads" ON crm_email_threads FOR ALL USING (
  EXISTS (SELECT 1 FROM crm_prospects WHERE crm_prospects.id = prospect_id AND crm_prospects.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

CREATE POLICY "Admin access to integration settings" ON crm_integration_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

CREATE POLICY "Admin access to analytics snapshots" ON crm_analytics_snapshots FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);
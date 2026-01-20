-- Phase 1: Add missing opportunity metrics to crm_campaigns
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_interested INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_meeting_booked INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_meeting_completed INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_closed INTEGER DEFAULT 0;

-- Phase 2: Create sequence steps analytics table
CREATE TABLE IF NOT EXISTS instantly_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  external_campaign_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  variant_id TEXT,
  variant_label TEXT,
  subject_line TEXT,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2),
  reply_rate NUMERIC(5,2),
  click_rate NUMERIC(5,2),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_campaign_id, step_number, variant_id)
);

-- Enable RLS
ALTER TABLE instantly_sequence_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for instantly_sequence_steps
CREATE POLICY "Admin and strategist can view sequence steps"
ON instantly_sequence_steps FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "Admin and strategist can manage sequence steps"
ON instantly_sequence_steps FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sequence_steps_campaign ON instantly_sequence_steps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_external ON instantly_sequence_steps(external_campaign_id);
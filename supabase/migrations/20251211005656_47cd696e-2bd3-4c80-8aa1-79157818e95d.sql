-- Add missing analytics columns to crm_campaigns
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS total_opportunities INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS contacted_count INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS completed_count INTEGER DEFAULT 0;
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS new_leads_contacted INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_external_id ON crm_campaigns(external_id);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_instantly_lead_id ON crm_prospects(instantly_lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_stage ON crm_prospects(stage);
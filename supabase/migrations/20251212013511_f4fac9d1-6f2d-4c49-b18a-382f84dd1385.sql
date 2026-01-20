-- =============================================================================
-- Phase 3: Smart Reply Intelligence Hub - Database Schema
-- =============================================================================

-- Reply Intelligence Table for detailed AI analysis
CREATE TABLE IF NOT EXISTS crm_reply_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID REFERENCES crm_email_replies(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES crm_prospects(id) ON DELETE SET NULL,
  
  -- Intent Scoring
  intent_score INTEGER CHECK (intent_score BETWEEN 0 AND 100),
  conversion_probability NUMERIC(5,2) CHECK (conversion_probability BETWEEN 0 AND 100),
  
  -- BANT Framework (Budget, Authority, Need, Timeline)
  buying_signals JSONB DEFAULT '{
    "budget": {"mentioned": false, "amount": null, "currency": null, "confidence": 0},
    "authority": {"is_decision_maker": false, "decision_maker_mentioned": null, "confidence": 0},
    "need": {"identified": false, "pain_points": [], "requirements": [], "confidence": 0},
    "timeline": {"mentioned": false, "timeframe": null, "urgency": null, "confidence": 0}
  }'::jsonb,
  
  -- Competitor Intelligence
  competitor_mentions TEXT[] DEFAULT '{}',
  competitor_sentiment TEXT CHECK (competitor_sentiment IN ('positive', 'neutral', 'negative')),
  
  -- Referral Opportunity
  referral_opportunity BOOLEAN DEFAULT FALSE,
  referral_contact JSONB DEFAULT NULL,
  
  -- Follow-up Recommendations
  follow_up_timing TEXT, -- e.g., "within 2 hours", "next business day", "1 week"
  follow_up_priority TEXT CHECK (follow_up_priority IN ('immediate', 'same_day', 'next_day', 'this_week', 'can_wait')),
  recommended_channel TEXT CHECK (recommended_channel IN ('email', 'phone', 'linkedin', 'meeting')),
  
  -- Objection Handling
  objections_detected JSONB DEFAULT '[]'::jsonb, -- [{type, objection, suggested_response}]
  questions_asked JSONB DEFAULT '[]'::jsonb, -- [{question, answer_hint}]
  
  -- Meeting Intent
  meeting_interest_level TEXT CHECK (meeting_interest_level IN ('high', 'medium', 'low', 'none')),
  preferred_meeting_times JSONB DEFAULT NULL,
  
  -- Smart Reply Suggestions
  smart_replies JSONB DEFAULT '{
    "professional": null,
    "friendly": null,
    "decline": null
  }'::jsonb,
  
  -- Analysis Metadata
  analysis_model TEXT DEFAULT 'gemini-2.5-flash',
  analysis_version TEXT DEFAULT '1.0',
  raw_analysis JSONB DEFAULT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE crm_reply_intelligence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view reply intelligence"
  ON crm_reply_intelligence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reply intelligence"
  ON crm_reply_intelligence FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reply intelligence"
  ON crm_reply_intelligence FOR UPDATE
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_reply_intelligence_reply_id ON crm_reply_intelligence(reply_id);
CREATE INDEX idx_reply_intelligence_prospect_id ON crm_reply_intelligence(prospect_id);
CREATE INDEX idx_reply_intelligence_intent_score ON crm_reply_intelligence(intent_score DESC);
CREATE INDEX idx_reply_intelligence_created_at ON crm_reply_intelligence(created_at DESC);

-- Add smart reply categories to crm_email_replies if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_email_replies' 
    AND column_name = 'smart_category'
  ) THEN
    ALTER TABLE crm_email_replies 
    ADD COLUMN smart_category TEXT DEFAULT 'all';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_email_replies' 
    AND column_name = 'intent_score'
  ) THEN
    ALTER TABLE crm_email_replies 
    ADD COLUMN intent_score INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_email_replies' 
    AND column_name = 'follow_up_priority'
  ) THEN
    ALTER TABLE crm_email_replies 
    ADD COLUMN follow_up_priority TEXT DEFAULT 'can_wait';
  END IF;
END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_reply_intelligence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reply_intelligence_updated_at
  BEFORE UPDATE ON crm_reply_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION update_reply_intelligence_updated_at();

-- Enable Realtime for reply intelligence
ALTER PUBLICATION supabase_realtime ADD TABLE crm_reply_intelligence;
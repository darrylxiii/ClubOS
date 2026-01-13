
-- =====================================================
-- THE QUANTUM CLUB - TALENT POOL SYSTEM
-- Phase 1: Database Schema Enhancement
-- =====================================================

-- =====================================================
-- 1. ALTER candidate_profiles - Add New Columns
-- =====================================================

-- Tier Management
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS talent_tier TEXT DEFAULT 'pool' CHECK (talent_tier IN ('hot', 'warm', 'strategic', 'pool', 'dormant', 'excluded')),
ADD COLUMN IF NOT EXISTS tier_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tier_update_reason TEXT;

-- Move Probability
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS move_probability DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS move_probability_factors JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS move_probability_updated_at TIMESTAMPTZ;

-- Availability
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'unknown' CHECK (availability_status IN ('actively_looking', 'passively_open', 'not_looking', 'employed_happy', 'unknown')),
ADD COLUMN IF NOT EXISTS availability_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS earliest_start_date DATE;

-- Classification
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS industries TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS functions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS seniority_level TEXT CHECK (seniority_level IN ('entry', 'mid', 'senior', 'director', 'vp', 'c_level', 'board'));

-- Career Signals
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS tenure_current_months INT,
ADD COLUMN IF NOT EXISTS career_velocity_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS detected_job_change BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS job_change_detected_at TIMESTAMPTZ;

-- Data Quality
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS data_freshness_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS needs_human_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS review_reason TEXT,
ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'unverified' CHECK (verification_level IN ('unverified', 'email_verified', 'phone_verified', 'linkedin_verified', 'fully_verified'));

-- Ownership
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS owned_by_strategist_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS ownership_assigned_at TIMESTAMPTZ;

-- GDPR Enhanced
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS consent_scope TEXT[],
ADD COLUMN IF NOT EXISTS consent_renewal_due TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data_deletion_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lawful_basis TEXT DEFAULT 'consent' CHECK (lawful_basis IN ('consent', 'legitimate_interest', 'contract'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_talent_tier ON candidate_profiles(talent_tier);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_tier_score ON candidate_profiles(tier_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_move_probability ON candidate_profiles(move_probability DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_availability_status ON candidate_profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_seniority_level ON candidate_profiles(seniority_level);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_owned_by ON candidate_profiles(owned_by_strategist_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_industries ON candidate_profiles USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_functions ON candidate_profiles USING GIN(functions);

-- =====================================================
-- 2. CREATE candidate_relationships Table
-- =====================================================

CREATE TABLE IF NOT EXISTS candidate_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID UNIQUE NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  primary_strategist_id UUID REFERENCES profiles(id),
  secondary_strategist_id UUID REFERENCES profiles(id),
  relationship_strength TEXT DEFAULT 'cold' CHECK (relationship_strength IN ('cold', 'warming', 'warm', 'strong', 'advocate')),
  warmth_score DECIMAL(5,2) DEFAULT 0 CHECK (warmth_score >= 0 AND warmth_score <= 100),
  last_meaningful_contact TIMESTAMPTZ,
  preferred_contact_channel TEXT CHECK (preferred_contact_channel IN ('email', 'phone', 'whatsapp', 'linkedin', 'in_person')),
  best_contact_time TEXT,
  total_touchpoints INT DEFAULT 0,
  outbound_messages INT DEFAULT 0,
  responses_received INT DEFAULT 0,
  response_rate DECIMAL(5,2),
  avg_response_time_hours DECIMAL(10,2),
  last_response_at TIMESTAMPTZ,
  roles_presented UUID[] DEFAULT '{}',
  roles_interested UUID[] DEFAULT '{}',
  roles_declined UUID[] DEFAULT '{}',
  roles_interviewed UUID[] DEFAULT '{}',
  roles_offered UUID[] DEFAULT '{}',
  roles_placed UUID[] DEFAULT '{}',
  referrals_made INT DEFAULT 0,
  successful_referrals INT DEFAULT 0,
  referral_quality_score DECIMAL(5,2),
  is_referral_source BOOLEAN DEFAULT FALSE,
  next_action TEXT,
  next_action_date DATE,
  follow_up_cadence_days INT DEFAULT 90,
  relationship_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for candidate_relationships
CREATE INDEX IF NOT EXISTS idx_candidate_relationships_candidate_id ON candidate_relationships(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_relationships_primary_strategist ON candidate_relationships(primary_strategist_id);
CREATE INDEX IF NOT EXISTS idx_candidate_relationships_strength ON candidate_relationships(relationship_strength);
CREATE INDEX IF NOT EXISTS idx_candidate_relationships_warmth ON candidate_relationships(warmth_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_relationships_next_action ON candidate_relationships(next_action_date);
CREATE INDEX IF NOT EXISTS idx_candidate_relationships_last_contact ON candidate_relationships(last_meaningful_contact DESC);

-- Enable RLS
ALTER TABLE candidate_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view candidate relationships"
  ON candidate_relationships FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Strategists can manage candidate relationships"
  ON candidate_relationships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

-- =====================================================
-- 3. CREATE skills_taxonomy Table
-- =====================================================

CREATE TABLE IF NOT EXISTS skills_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'leadership', 'industry', 'soft', 'language', 'certification', 'tool')),
  subcategory TEXT,
  parent_skill_id UUID REFERENCES skills_taxonomy(id),
  synonyms TEXT[] DEFAULT '{}',
  related_skill_ids UUID[] DEFAULT '{}',
  luxury_fashion_relevance DECIMAL(3,2) DEFAULT 0 CHECK (luxury_fashion_relevance >= 0 AND luxury_fashion_relevance <= 1),
  beauty_relevance DECIMAL(3,2) DEFAULT 0 CHECK (beauty_relevance >= 0 AND beauty_relevance <= 1),
  tech_relevance DECIMAL(3,2) DEFAULT 0 CHECK (tech_relevance >= 0 AND tech_relevance <= 1),
  finance_relevance DECIMAL(3,2) DEFAULT 0 CHECK (finance_relevance >= 0 AND finance_relevance <= 1),
  current_demand_score DECIMAL(3,2) DEFAULT 0.5 CHECK (current_demand_score >= 0 AND current_demand_score <= 1),
  demand_trend TEXT DEFAULT 'stable' CHECK (demand_trend IN ('rising', 'stable', 'declining')),
  description TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for skills_taxonomy
CREATE INDEX IF NOT EXISTS idx_skills_taxonomy_category ON skills_taxonomy(category);
CREATE INDEX IF NOT EXISTS idx_skills_taxonomy_slug ON skills_taxonomy(slug);
CREATE INDEX IF NOT EXISTS idx_skills_taxonomy_parent ON skills_taxonomy(parent_skill_id);
CREATE INDEX IF NOT EXISTS idx_skills_taxonomy_synonyms ON skills_taxonomy USING GIN(synonyms);
CREATE INDEX IF NOT EXISTS idx_skills_taxonomy_demand ON skills_taxonomy(current_demand_score DESC);

-- Enable RLS
ALTER TABLE skills_taxonomy ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view skills taxonomy"
  ON skills_taxonomy FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage skills taxonomy"
  ON skills_taxonomy FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- 4. CREATE talent_pool_lists Table
-- =====================================================

CREATE TABLE IF NOT EXISTS talent_pool_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8B5CF6',
  icon TEXT DEFAULT 'users',
  list_type TEXT DEFAULT 'manual' CHECK (list_type IN ('manual', 'smart', 'job_pipeline', 'campaign')),
  smart_criteria JSONB,
  auto_refresh BOOLEAN DEFAULT FALSE,
  linked_job_id UUID REFERENCES jobs(id),
  candidate_count INT DEFAULT 0,
  is_shared BOOLEAN DEFAULT FALSE,
  shared_with UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for talent_pool_lists
CREATE INDEX IF NOT EXISTS idx_talent_pool_lists_created_by ON talent_pool_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_talent_pool_lists_type ON talent_pool_lists(list_type);
CREATE INDEX IF NOT EXISTS idx_talent_pool_lists_linked_job ON talent_pool_lists(linked_job_id);

-- Enable RLS
ALTER TABLE talent_pool_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own lists or shared lists"
  ON talent_pool_lists FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR is_shared = true 
    OR auth.uid() = ANY(shared_with)
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Users can create their own lists"
  ON talent_pool_lists FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own lists"
  ON talent_pool_lists FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ));

CREATE POLICY "Users can delete their own lists"
  ON talent_pool_lists FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ));

-- =====================================================
-- 5. CREATE talent_pool_list_members Table
-- =====================================================

CREATE TABLE IF NOT EXISTS talent_pool_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES talent_pool_lists(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  added_by UUID REFERENCES profiles(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  position INT,
  UNIQUE(list_id, candidate_id)
);

-- Indexes for talent_pool_list_members
CREATE INDEX IF NOT EXISTS idx_talent_pool_list_members_list ON talent_pool_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_list_members_candidate ON talent_pool_list_members(candidate_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_list_members_position ON talent_pool_list_members(list_id, position);

-- Enable RLS
ALTER TABLE talent_pool_list_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view list members for accessible lists"
  ON talent_pool_list_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM talent_pool_lists 
      WHERE id = list_id 
      AND (
        created_by = auth.uid() 
        OR is_shared = true 
        OR auth.uid() = ANY(shared_with)
        OR EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role IN ('admin', 'strategist')
        )
      )
    )
  );

CREATE POLICY "Users can manage members in their lists"
  ON talent_pool_list_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM talent_pool_lists 
      WHERE id = list_id 
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role IN ('admin', 'strategist')
        )
      )
    )
  );

-- =====================================================
-- 6. CREATE company_intelligence Table
-- =====================================================

CREATE TABLE IF NOT EXISTS company_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_name_normalized TEXT UNIQUE NOT NULL,
  linkedin_url TEXT,
  website TEXT,
  logo_url TEXT,
  industry TEXT,
  sub_industry TEXT,
  company_size TEXT CHECK (company_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  employee_count_estimate INT,
  headquarters_location TEXT,
  is_client BOOLEAN DEFAULT FALSE,
  is_prospect BOOLEAN DEFAULT FALSE,
  is_competitor BOOLEAN DEFAULT FALSE,
  is_target_company BOOLEAN DEFAULT FALSE,
  relationship_owner UUID REFERENCES profiles(id),
  candidates_from_count INT DEFAULT 0,
  candidates_placed_to INT DEFAULT 0,
  avg_tenure_months DECIMAL(5,1),
  growth_signal TEXT CHECK (growth_signal IN ('expanding', 'stable', 'contracting', 'unknown')),
  hiring_velocity TEXT CHECK (hiring_velocity IN ('aggressive', 'moderate', 'slow', 'freezing', 'unknown')),
  recent_funding JSONB,
  recent_news JSONB,
  key_contacts JSONB,
  org_chart_notes TEXT,
  culture_notes TEXT,
  compensation_intel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for company_intelligence
CREATE INDEX IF NOT EXISTS idx_company_intelligence_name ON company_intelligence(company_name_normalized);
CREATE INDEX IF NOT EXISTS idx_company_intelligence_industry ON company_intelligence(industry);
CREATE INDEX IF NOT EXISTS idx_company_intelligence_is_client ON company_intelligence(is_client) WHERE is_client = true;
CREATE INDEX IF NOT EXISTS idx_company_intelligence_is_target ON company_intelligence(is_target_company) WHERE is_target_company = true;
CREATE INDEX IF NOT EXISTS idx_company_intelligence_owner ON company_intelligence(relationship_owner);

-- Enable RLS
ALTER TABLE company_intelligence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view company intelligence"
  ON company_intelligence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Strategists can manage company intelligence"
  ON company_intelligence FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

-- =====================================================
-- 7. CREATE enrichment_logs Table
-- =====================================================

CREATE TABLE IF NOT EXISTS enrichment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('linkedin', 'proxycurl', 'clearbit', 'manual', 'ai_inference', 'email_verification', 'phone_verification')),
  enrichment_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'partial', 'failed', 'skipped')),
  data_before JSONB,
  data_after JSONB,
  fields_updated TEXT[],
  error_message TEXT,
  retry_count INT DEFAULT 0,
  api_credits_used DECIMAL(10,4),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for enrichment_logs
CREATE INDEX IF NOT EXISTS idx_enrichment_logs_candidate ON enrichment_logs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_logs_source ON enrichment_logs(source);
CREATE INDEX IF NOT EXISTS idx_enrichment_logs_status ON enrichment_logs(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_logs_started ON enrichment_logs(started_at DESC);

-- Enable RLS
ALTER TABLE enrichment_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Strategists can view enrichment logs"
  ON enrichment_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Strategists can create enrichment logs"
  ON enrichment_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

-- =====================================================
-- 8. CREATE Database Functions
-- =====================================================

-- Function: Calculate tier score for a candidate
CREATE OR REPLACE FUNCTION calculate_tier_score(p_candidate_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL(5,2) := 0;
  v_move_prob DECIMAL(5,2);
  v_warmth DECIMAL(5,2);
  v_last_contact TIMESTAMPTZ;
  v_profile_complete DECIMAL(5,2);
  v_response_rate DECIMAL(5,2);
  v_referrals INT;
  v_recency_score DECIMAL(5,2);
BEGIN
  -- Get candidate data
  SELECT 
    COALESCE(cp.move_probability, 0),
    COALESCE(cp.profile_completeness, 0)
  INTO v_move_prob, v_profile_complete
  FROM candidate_profiles cp
  WHERE cp.id = p_candidate_id;

  -- Get relationship data
  SELECT 
    COALESCE(cr.warmth_score, 0),
    cr.last_meaningful_contact,
    COALESCE(cr.response_rate, 0),
    COALESCE(cr.successful_referrals, 0)
  INTO v_warmth, v_last_contact, v_response_rate, v_referrals
  FROM candidate_relationships cr
  WHERE cr.candidate_id = p_candidate_id;

  -- Calculate recency score (20% weight)
  -- Full points for contact within 7 days, decreasing over time
  IF v_last_contact IS NULL THEN
    v_recency_score := 20;
  ELSIF v_last_contact > NOW() - INTERVAL '7 days' THEN
    v_recency_score := 100;
  ELSIF v_last_contact > NOW() - INTERVAL '14 days' THEN
    v_recency_score := 80;
  ELSIF v_last_contact > NOW() - INTERVAL '30 days' THEN
    v_recency_score := 60;
  ELSIF v_last_contact > NOW() - INTERVAL '60 days' THEN
    v_recency_score := 40;
  ELSIF v_last_contact > NOW() - INTERVAL '90 days' THEN
    v_recency_score := 20;
  ELSE
    v_recency_score := 10;
  END IF;

  -- Calculate weighted score
  -- Move probability: 25%
  -- Relationship warmth: 25%
  -- Recency of contact: 20%
  -- Profile completeness: 15%
  -- Response rate: 10%
  -- Referral bonus: 5%
  v_score := (
    (COALESCE(v_move_prob, 0) * 0.25) +
    (COALESCE(v_warmth, 0) * 0.25) +
    (v_recency_score * 0.20) +
    (COALESCE(v_profile_complete, 0) * 0.15) +
    (COALESCE(v_response_rate, 0) * 0.10) +
    (LEAST(v_referrals * 20, 100) * 0.05)
  );

  RETURN ROUND(v_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Determine tier from score
CREATE OR REPLACE FUNCTION get_tier_from_score(p_score DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF p_score >= 80 THEN
    RETURN 'hot';
  ELSIF p_score >= 60 THEN
    RETURN 'warm';
  ELSIF p_score >= 40 THEN
    RETURN 'strategic';
  ELSIF p_score >= 20 THEN
    RETURN 'pool';
  ELSE
    RETURN 'dormant';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Update candidate tier
CREATE OR REPLACE FUNCTION update_candidate_tier(p_candidate_id UUID, p_reason TEXT DEFAULT 'auto_calculated')
RETURNS VOID AS $$
DECLARE
  v_new_score DECIMAL(5,2);
  v_new_tier TEXT;
BEGIN
  -- Calculate new score
  v_new_score := calculate_tier_score(p_candidate_id);
  v_new_tier := get_tier_from_score(v_new_score);

  -- Update candidate
  UPDATE candidate_profiles
  SET 
    tier_score = v_new_score,
    talent_tier = v_new_tier,
    tier_updated_at = NOW(),
    tier_update_reason = p_reason
  WHERE id = p_candidate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update relationship metrics after touchpoint
CREATE OR REPLACE FUNCTION update_relationship_metrics(p_candidate_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_touchpoints INT;
  v_outbound INT;
  v_responses INT;
  v_response_rate DECIMAL(5,2);
  v_last_contact TIMESTAMPTZ;
  v_warmth_score DECIMAL(5,2);
  v_strength TEXT;
BEGIN
  -- Count touchpoints from candidate_interactions
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE interaction_type IN ('email_sent', 'call_outbound', 'linkedin_message_sent')),
    COUNT(*) FILTER (WHERE interaction_type IN ('email_received', 'call_inbound', 'linkedin_message_received')),
    MAX(created_at)
  INTO v_total_touchpoints, v_outbound, v_responses, v_last_contact
  FROM candidate_interactions
  WHERE candidate_id = p_candidate_id;

  -- Calculate response rate
  IF v_outbound > 0 THEN
    v_response_rate := ROUND((v_responses::DECIMAL / v_outbound) * 100, 2);
  ELSE
    v_response_rate := 0;
  END IF;

  -- Calculate warmth score based on activity
  v_warmth_score := LEAST(
    (v_total_touchpoints * 5) + 
    (v_response_rate * 0.5) +
    (CASE WHEN v_last_contact > NOW() - INTERVAL '30 days' THEN 30 ELSE 0 END),
    100
  );

  -- Determine relationship strength
  IF v_warmth_score >= 80 THEN
    v_strength := 'advocate';
  ELSIF v_warmth_score >= 60 THEN
    v_strength := 'strong';
  ELSIF v_warmth_score >= 40 THEN
    v_strength := 'warm';
  ELSIF v_warmth_score >= 20 THEN
    v_strength := 'warming';
  ELSE
    v_strength := 'cold';
  END IF;

  -- Upsert relationship record
  INSERT INTO candidate_relationships (
    candidate_id,
    total_touchpoints,
    outbound_messages,
    responses_received,
    response_rate,
    last_meaningful_contact,
    warmth_score,
    relationship_strength,
    updated_at
  )
  VALUES (
    p_candidate_id,
    v_total_touchpoints,
    v_outbound,
    v_responses,
    v_response_rate,
    v_last_contact,
    v_warmth_score,
    v_strength,
    NOW()
  )
  ON CONFLICT (candidate_id) DO UPDATE SET
    total_touchpoints = EXCLUDED.total_touchpoints,
    outbound_messages = EXCLUDED.outbound_messages,
    responses_received = EXCLUDED.responses_received,
    response_rate = EXCLUDED.response_rate,
    last_meaningful_contact = EXCLUDED.last_meaningful_contact,
    warmth_score = EXCLUDED.warmth_score,
    relationship_strength = EXCLUDED.relationship_strength,
    updated_at = NOW();

  -- Update tier score
  PERFORM update_candidate_tier(p_candidate_id, 'relationship_updated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-update list candidate count
CREATE OR REPLACE FUNCTION update_list_candidate_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE talent_pool_lists 
    SET candidate_count = candidate_count + 1,
        updated_at = NOW()
    WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE talent_pool_lists 
    SET candidate_count = candidate_count - 1,
        updated_at = NOW()
    WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_list_count ON talent_pool_list_members;
CREATE TRIGGER trigger_update_list_count
AFTER INSERT OR DELETE ON talent_pool_list_members
FOR EACH ROW EXECUTE FUNCTION update_list_candidate_count();

-- Trigger: Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_candidate_relationships_updated ON candidate_relationships;
CREATE TRIGGER trigger_candidate_relationships_updated
BEFORE UPDATE ON candidate_relationships
FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

DROP TRIGGER IF EXISTS trigger_skills_taxonomy_updated ON skills_taxonomy;
CREATE TRIGGER trigger_skills_taxonomy_updated
BEFORE UPDATE ON skills_taxonomy
FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

DROP TRIGGER IF EXISTS trigger_talent_pool_lists_updated ON talent_pool_lists;
CREATE TRIGGER trigger_talent_pool_lists_updated
BEFORE UPDATE ON talent_pool_lists
FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

DROP TRIGGER IF EXISTS trigger_company_intelligence_updated ON company_intelligence;
CREATE TRIGGER trigger_company_intelligence_updated
BEFORE UPDATE ON company_intelligence
FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE candidate_relationships;
ALTER PUBLICATION supabase_realtime ADD TABLE talent_pool_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE talent_pool_list_members;

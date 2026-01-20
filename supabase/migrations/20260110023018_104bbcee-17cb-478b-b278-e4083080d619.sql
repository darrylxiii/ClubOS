-- =====================================================
-- THE QUANTUM CLUB REVENUE LADDER ENGINE
-- Enterprise-Grade Incentive & Capital Allocation System
-- =====================================================

-- 1. REVENUE LADDERS (The Spine)
-- Defines the ladder tracks: annual execution vs cumulative vision
CREATE TABLE public.revenue_ladders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  track_type TEXT NOT NULL CHECK (track_type IN ('annual', 'cumulative')),
  revenue_definition TEXT NOT NULL DEFAULT 'collected' CHECK (revenue_definition IN ('booked', 'collected')),
  fiscal_year_start INTEGER DEFAULT 1 CHECK (fiscal_year_start BETWEEN 1 AND 12),
  is_active BOOLEAN DEFAULT true,
  safety_config JSONB DEFAULT '{"min_runway_months": 6, "max_reward_percentage": 15}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. REVENUE MILESTONES (Individual Rungs)
-- Each milestone on the ladder with status tracking
CREATE TABLE public.revenue_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ladder_id UUID NOT NULL REFERENCES public.revenue_ladders(id) ON DELETE CASCADE,
  threshold_amount DECIMAL(12,2) NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'approaching', 'unlocked', 'rewarded')),
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  achieved_revenue DECIMAL(12,2) DEFAULT 0,
  unlocked_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  fiscal_year INTEGER,
  default_category TEXT CHECK (default_category IN ('enablement', 'experience', 'assets', 'cash')),
  suggested_reward_range JSONB DEFAULT '{"min": 0, "max": 0}'::jsonb,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. REWARD PROPOSALS (Democratic Proposal System)
-- Anyone can propose, everyone can see
CREATE TABLE public.reward_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.revenue_milestones(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('enablement', 'experience', 'assets', 'cash')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_cost DECIMAL(10,2) NOT NULL,
  rationale TEXT,
  impact_type TEXT[] DEFAULT '{}' CHECK (impact_type <@ ARRAY['speed', 'quality', 'retention', 'leverage']),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'voting', 'decided', 'withdrawn')),
  voting_deadline TIMESTAMPTZ,
  decision_deadline TIMESTAMPTZ,
  vote_count_support INTEGER DEFAULT 0,
  vote_count_neutral INTEGER DEFAULT 0,
  vote_count_concern INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

-- 4. PROPOSAL VOTES (Non-binding Advisory Votes)
-- Transparent voting - everyone sees all votes
CREATE TABLE public.proposal_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.reward_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('support', 'neutral', 'concern')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

-- 5. REWARD DECISIONS (Leadership Transparency Log)
-- Every decision is logged with full rationale
CREATE TABLE public.reward_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.revenue_milestones(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.reward_proposals(id) ON DELETE SET NULL,
  decided_by UUID NOT NULL REFERENCES auth.users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'deferred', 'modified')),
  rationale TEXT NOT NULL,
  approved_amount DECIMAL(10,2),
  modified_details TEXT,
  runway_impact JSONB,
  cash_position_at_decision DECIMAL(12,2),
  runway_months_at_decision DECIMAL(4,1),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. MILESTONE CONTRIBUTIONS (Role-to-Revenue Visibility)
-- Shows how each person contributes to milestones
CREATE TABLE public.milestone_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  milestone_id UUID NOT NULL REFERENCES public.revenue_milestones(id) ON DELETE CASCADE,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('placement', 'referral', 'retention', 'expansion', 'new_client', 'other')),
  revenue_attributed DECIMAL(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  source_entity_type TEXT,
  source_entity_id UUID,
  attributed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. REWARD SAFETY RULES (CFO Guard Rails)
-- Configurable financial safety thresholds
CREATE TABLE public.reward_safety_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_runway_months INTEGER NOT NULL DEFAULT 6,
  max_reward_percentage_of_cash DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  require_finance_approval_above DECIMAL(10,2) DEFAULT 5000,
  auto_reject_if_runway_below INTEGER DEFAULT 3,
  notify_finance_on_proposal BOOLEAN DEFAULT true,
  notify_roles TEXT[] DEFAULT ARRAY['admin'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 8. MILESTONE CELEBRATIONS (Achievement Events)
-- Track unlock celebrations for gamification
CREATE TABLE public.milestone_celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.revenue_milestones(id) ON DELETE CASCADE,
  celebration_type TEXT NOT NULL DEFAULT 'unlock',
  celebrated_at TIMESTAMPTZ DEFAULT now(),
  participants UUID[] DEFAULT '{}',
  celebration_data JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_revenue_milestones_ladder ON public.revenue_milestones(ladder_id);
CREATE INDEX idx_revenue_milestones_status ON public.revenue_milestones(status);
CREATE INDEX idx_reward_proposals_milestone ON public.reward_proposals(milestone_id);
CREATE INDEX idx_reward_proposals_status ON public.reward_proposals(status);
CREATE INDEX idx_reward_proposals_proposed_by ON public.reward_proposals(proposed_by);
CREATE INDEX idx_proposal_votes_proposal ON public.proposal_votes(proposal_id);
CREATE INDEX idx_proposal_votes_user ON public.proposal_votes(user_id);
CREATE INDEX idx_reward_decisions_milestone ON public.reward_decisions(milestone_id);
CREATE INDEX idx_milestone_contributions_user ON public.milestone_contributions(user_id);
CREATE INDEX idx_milestone_contributions_milestone ON public.milestone_contributions(milestone_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.revenue_ladders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_safety_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_celebrations ENABLE ROW LEVEL SECURITY;

-- Revenue Ladders: All authenticated can view, admin can manage
CREATE POLICY "Anyone can view revenue ladders"
  ON public.revenue_ladders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage revenue ladders"
  ON public.revenue_ladders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

-- Revenue Milestones: All authenticated can view, admin can manage
CREATE POLICY "Anyone can view milestones"
  ON public.revenue_milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage milestones"
  ON public.revenue_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

-- Reward Proposals: Transparent - all can view, auth can create their own
CREATE POLICY "Anyone can view proposals"
  ON public.reward_proposals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create proposals"
  ON public.reward_proposals FOR INSERT
  TO authenticated
  WITH CHECK (proposed_by = auth.uid());

CREATE POLICY "Users can update their own draft proposals"
  ON public.reward_proposals FOR UPDATE
  TO authenticated
  USING (proposed_by = auth.uid() AND status = 'draft');

CREATE POLICY "Admins can manage all proposals"
  ON public.reward_proposals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

-- Proposal Votes: Transparent voting
CREATE POLICY "Anyone can view votes"
  ON public.proposal_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can cast their own vote"
  ON public.proposal_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own vote"
  ON public.proposal_votes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own vote"
  ON public.proposal_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Reward Decisions: All can view (transparency), only leadership can create
CREATE POLICY "Anyone can view decisions"
  ON public.reward_decisions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Leadership can create decisions"
  ON public.reward_decisions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

-- Milestone Contributions: Users see their own, admins see all
CREATE POLICY "Users can view their own contributions"
  ON public.milestone_contributions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all contributions"
  ON public.milestone_contributions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins can manage contributions"
  ON public.milestone_contributions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

-- Reward Safety Rules: Only admin/finance can manage
CREATE POLICY "Anyone can view safety rules"
  ON public.reward_safety_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage safety rules"
  ON public.reward_safety_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Milestone Celebrations: All can view
CREATE POLICY "Anyone can view celebrations"
  ON public.milestone_celebrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage celebrations"
  ON public.milestone_celebrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_revenue_ladders_updated_at
  BEFORE UPDATE ON public.revenue_ladders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_revenue_milestones_updated_at
  BEFORE UPDATE ON public.revenue_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reward_proposals_updated_at
  BEFORE UPDATE ON public.reward_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proposal_votes_updated_at
  BEFORE UPDATE ON public.proposal_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reward_safety_rules_updated_at
  BEFORE UPDATE ON public.reward_safety_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTION: Update vote counts on proposal
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_proposal_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.reward_proposals
    SET 
      vote_count_support = (SELECT COUNT(*) FROM public.proposal_votes WHERE proposal_id = NEW.proposal_id AND vote_type = 'support'),
      vote_count_neutral = (SELECT COUNT(*) FROM public.proposal_votes WHERE proposal_id = NEW.proposal_id AND vote_type = 'neutral'),
      vote_count_concern = (SELECT COUNT(*) FROM public.proposal_votes WHERE proposal_id = NEW.proposal_id AND vote_type = 'concern')
    WHERE id = NEW.proposal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reward_proposals
    SET 
      vote_count_support = (SELECT COUNT(*) FROM public.proposal_votes WHERE proposal_id = OLD.proposal_id AND vote_type = 'support'),
      vote_count_neutral = (SELECT COUNT(*) FROM public.proposal_votes WHERE proposal_id = OLD.proposal_id AND vote_type = 'neutral'),
      vote_count_concern = (SELECT COUNT(*) FROM public.proposal_votes WHERE proposal_id = OLD.proposal_id AND vote_type = 'concern')
    WHERE id = OLD.proposal_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_vote_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.proposal_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_proposal_vote_counts();

-- =====================================================
-- SEED DATA: Default Ladders and Milestones
-- =====================================================

-- Insert default Annual Track
INSERT INTO public.revenue_ladders (name, description, track_type, revenue_definition) VALUES
('Annual Execution Track', 'Short-term execution focus - drives urgency and momentum with smaller, more frequent rewards', 'annual', 'collected'),
('Cumulative Vision Track', 'Long-term vision focus - drives loyalty and encourages long-term thinking with structural rewards', 'cumulative', 'collected');

-- Get ladder IDs for milestone insertion
WITH annual_ladder AS (
  SELECT id FROM public.revenue_ladders WHERE track_type = 'annual' LIMIT 1
),
cumulative_ladder AS (
  SELECT id FROM public.revenue_ladders WHERE track_type = 'cumulative' LIMIT 1
)
-- Insert Annual Track Milestones
INSERT INTO public.revenue_milestones (ladder_id, threshold_amount, display_name, description, default_category, suggested_reward_range, display_order)
SELECT 
  (SELECT id FROM annual_ladder),
  threshold,
  name,
  desc_text,
  category,
  range_json::jsonb,
  ord
FROM (VALUES
  (250000, '€250K', 'First major milestone - team dinner and tooling upgrade', 'enablement', '{"min": 500, "max": 2500}', 1),
  (500000, '€500K', 'Half million - short offsite and automation investment', 'experience', '{"min": 2500, "max": 10000}', 2),
  (1000000, '€1M', 'Million milestone - major OS upgrade, strategic hire, optional bonus pool', 'enablement', '{"min": 10000, "max": 25000}', 3),
  (3000000, '€3M', 'Three million - international retreat, long-term infrastructure', 'experience', '{"min": 25000, "max": 75000}', 4)
) AS t(threshold, name, desc_text, category, range_json, ord);

-- Insert Cumulative Track Milestones
WITH cumulative_ladder AS (
  SELECT id FROM public.revenue_ladders WHERE track_type = 'cumulative' LIMIT 1
)
INSERT INTO public.revenue_milestones (ladder_id, threshold_amount, display_name, description, default_category, suggested_reward_range, display_order)
SELECT 
  (SELECT id FROM cumulative_ladder),
  threshold,
  name,
  desc_text,
  category,
  range_json::jsonb,
  ord
FROM (VALUES
  (5000000, '€5M Lifetime', 'Five million lifetime - legacy investment, equity-like pool, major acquisition', 'assets', '{"min": 50000, "max": 150000}', 1),
  (10000000, '€10M Lifetime', 'Ten million lifetime - major infrastructure asset, legacy reward', 'assets', '{"min": 100000, "max": 300000}', 2)
) AS t(threshold, name, desc_text, category, range_json, ord);

-- Insert default safety rules
INSERT INTO public.reward_safety_rules (min_runway_months, max_reward_percentage_of_cash, require_finance_approval_above, auto_reject_if_runway_below)
VALUES (6, 15.00, 5000, 3);

-- =====================================================
-- ENABLE REALTIME FOR KEY TABLES
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.revenue_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_votes;
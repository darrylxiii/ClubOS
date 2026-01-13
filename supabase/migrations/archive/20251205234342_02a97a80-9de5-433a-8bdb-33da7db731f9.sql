-- =========================================================================
-- CONNECT DISCONNECTED SYSTEMS MIGRATION
-- Creates tables and triggers for system integration
-- =========================================================================

-- 1. Create reengagement_history table for tracking automated campaigns
CREATE TABLE IF NOT EXISTS public.reengagement_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL,
  template_id TEXT NOT NULL,
  trigger_reason TEXT,
  churn_score NUMERIC,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reengagement_history ENABLE ROW LEVEL SECURITY;

-- RLS policy for admins
CREATE POLICY "Admins can view all reengagement history"
  ON public.reengagement_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'strategist')
    )
  );

-- 2. Create candidate_offers table for offer tracking with salary recommendations
CREATE TABLE IF NOT EXISTS public.candidate_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  base_salary NUMERIC,
  bonus_percentage NUMERIC,
  equity_percentage NUMERIC,
  total_compensation NUMERIC,
  salary_percentile INTEGER,
  market_competitiveness_score NUMERIC,
  ai_recommendation JSONB,
  benchmark_comparison JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'sent', 'accepted', 'rejected', 'negotiating', 'expired')),
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.candidate_offers ENABLE ROW LEVEL SECURITY;

-- RLS policies for offers
CREATE POLICY "Users can view offers for their company jobs"
  ON public.candidate_offers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.company_members cm ON cm.company_id = j.company_id
      WHERE j.id = candidate_offers.job_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Authorized users can create offers"
  ON public.candidate_offers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.company_members cm ON cm.company_id = j.company_id
      WHERE j.id = candidate_offers.job_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Authorized users can update offers"
  ON public.candidate_offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.company_members cm ON cm.company_id = j.company_id
      WHERE j.id = candidate_offers.job_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'strategist')
    )
  );

-- 3. Add interview intelligence fields to candidate_profiles if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'interview_score_avg') THEN
    ALTER TABLE public.candidate_profiles ADD COLUMN interview_score_avg NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'interview_count') THEN
    ALTER TABLE public.candidate_profiles ADD COLUMN interview_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'ai_recommendation') THEN
    ALTER TABLE public.candidate_profiles ADD COLUMN ai_recommendation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'key_strengths_aggregated') THEN
    ALTER TABLE public.candidate_profiles ADD COLUMN key_strengths_aggregated TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'key_weaknesses_aggregated') THEN
    ALTER TABLE public.candidate_profiles ADD COLUMN key_weaknesses_aggregated TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'last_interview_at') THEN
    ALTER TABLE public.candidate_profiles ADD COLUMN last_interview_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. Create function to sync interview reports to candidate profile
CREATE OR REPLACE FUNCTION sync_interview_to_candidate()
RETURNS TRIGGER AS $$
DECLARE
  avg_score NUMERIC;
  total_count INTEGER;
  latest_recommendation TEXT;
  all_strengths TEXT[];
  all_weaknesses TEXT[];
BEGIN
  -- Skip if no candidate_id
  IF NEW.candidate_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate aggregate scores from all interview reports for this candidate
  SELECT 
    AVG(recommendation_confidence),
    COUNT(*),
    array_agg(DISTINCT unnest_strengths),
    array_agg(DISTINCT unnest_weaknesses)
  INTO avg_score, total_count, all_strengths, all_weaknesses
  FROM public.interview_reports ir
  CROSS JOIN LATERAL unnest(COALESCE(ir.key_strengths, ARRAY[]::TEXT[])) AS unnest_strengths
  CROSS JOIN LATERAL unnest(COALESCE(ir.key_weaknesses, ARRAY[]::TEXT[])) AS unnest_weaknesses
  WHERE ir.candidate_id = NEW.candidate_id;

  -- Get the latest recommendation
  SELECT recommendation INTO latest_recommendation
  FROM public.interview_reports
  WHERE candidate_id = NEW.candidate_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Update candidate profile with aggregated interview data
  UPDATE public.candidate_profiles
  SET 
    interview_score_avg = COALESCE(avg_score, 0),
    interview_count = COALESCE(total_count, 0),
    ai_recommendation = latest_recommendation,
    key_strengths_aggregated = all_strengths,
    key_weaknesses_aggregated = all_weaknesses,
    last_interview_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.candidate_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create trigger on interview_reports
DROP TRIGGER IF EXISTS on_interview_report_insert ON public.interview_reports;
CREATE TRIGGER on_interview_report_insert
  AFTER INSERT ON public.interview_reports
  FOR EACH ROW
  EXECUTE FUNCTION sync_interview_to_candidate();

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reengagement_history_user_id ON public.reengagement_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reengagement_history_sent_at ON public.reengagement_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_offers_candidate_id ON public.candidate_offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_offers_job_id ON public.candidate_offers(job_id);
CREATE INDEX IF NOT EXISTS idx_candidate_offers_status ON public.candidate_offers(status);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_interview_score ON public.candidate_profiles(interview_score_avg DESC NULLS LAST);

-- 7. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.reengagement_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_offers;
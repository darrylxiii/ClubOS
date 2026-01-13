-- Sprint 4A: Create remaining tables and functions (skip existing kpi_export_approvals)

-- 1. Drop existing functions first
DROP FUNCTION IF EXISTS public.log_kpi_access(uuid,text,text,text,jsonb);
DROP FUNCTION IF EXISTS public.get_kpi_audit_summary(integer);

-- 2. Create log_kpi_access RPC function
CREATE OR REPLACE FUNCTION public.log_kpi_access(
  p_user_id UUID,
  p_action_type TEXT,
  p_kpi_name TEXT DEFAULT NULL,
  p_domain TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO kpi_access_log (user_id, action_type, kpi_name, domain, metadata)
  VALUES (p_user_id, p_action_type, p_kpi_name, p_domain, p_metadata);
END;
$$;

-- 3. Create get_kpi_audit_summary RPC function
CREATE OR REPLACE FUNCTION public.get_kpi_audit_summary(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  start_date TIMESTAMPTZ;
BEGIN
  start_date := now() - (p_days || ' days')::INTERVAL;
  
  SELECT jsonb_build_object(
    'total_actions', COUNT(*),
    'unique_users', COUNT(DISTINCT user_id),
    'by_action_type', (
      SELECT jsonb_object_agg(action_type, cnt)
      FROM (
        SELECT action_type, COUNT(*) as cnt
        FROM kpi_access_log
        WHERE created_at >= start_date
        GROUP BY action_type
      ) action_counts
    ),
    'by_domain', (
      SELECT jsonb_object_agg(COALESCE(domain, 'unknown'), cnt)
      FROM (
        SELECT domain, COUNT(*) as cnt
        FROM kpi_access_log
        WHERE created_at >= start_date AND domain IS NOT NULL
        GROUP BY domain
      ) domain_counts
    ),
    'top_kpis', (
      SELECT jsonb_agg(jsonb_build_object('kpi_name', kpi_name, 'count', cnt))
      FROM (
        SELECT kpi_name, COUNT(*) as cnt
        FROM kpi_access_log
        WHERE created_at >= start_date AND kpi_name IS NOT NULL
        GROUP BY kpi_name
        ORDER BY cnt DESC
        LIMIT 10
      ) top_kpis
    ),
    'period_days', p_days
  ) INTO result
  FROM kpi_access_log
  WHERE created_at >= start_date;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 4. Create OKR Objectives table
CREATE TABLE IF NOT EXISTS public.okr_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'on-track' CHECK (status IN ('on-track', 'at-risk', 'behind', 'completed')),
  progress NUMERIC(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create OKR Key Results table
CREATE TABLE IF NOT EXISTS public.okr_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.okr_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'on-track' CHECK (status IN ('on-track', 'at-risk', 'behind', 'completed')),
  contribution_weight NUMERIC(3,2) DEFAULT 1.0 CHECK (contribution_weight >= 0 AND contribution_weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create KPI to OKR links table
CREATE TABLE IF NOT EXISTS public.kpi_okr_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name TEXT NOT NULL,
  key_result_id UUID NOT NULL REFERENCES public.okr_key_results(id) ON DELETE CASCADE,
  contribution_weight NUMERIC(3,2) DEFAULT 1.0 CHECK (contribution_weight >= 0 AND contribution_weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(kpi_name, key_result_id)
);

-- 7. Create KPI Lineage Metadata table
CREATE TABLE IF NOT EXISTS public.kpi_lineage_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name TEXT NOT NULL UNIQUE,
  source_tables TEXT[],
  source_apis TEXT[],
  transformations JSONB DEFAULT '[]'::jsonb,
  refresh_rate TEXT,
  dependencies TEXT[],
  consumers TEXT[],
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create Personal KPI Goals table
CREATE TABLE IF NOT EXISTS public.personal_kpi_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  personal_target NUMERIC NOT NULL,
  official_target NUMERIC,
  current_value NUMERIC DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, kpi_name)
);

-- 9. Enable RLS on all new tables
ALTER TABLE public.okr_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_okr_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_lineage_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_kpi_goals ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for okr_objectives
CREATE POLICY "okr_objectives_select" ON public.okr_objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "okr_objectives_insert" ON public.okr_objectives FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);
CREATE POLICY "okr_objectives_update" ON public.okr_objectives FOR UPDATE TO authenticated USING (
  owner_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);
CREATE POLICY "okr_objectives_delete" ON public.okr_objectives FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

-- 11. RLS Policies for okr_key_results
CREATE POLICY "okr_key_results_select" ON public.okr_key_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "okr_key_results_modify" ON public.okr_key_results FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

-- 12. RLS Policies for kpi_okr_links
CREATE POLICY "kpi_okr_links_select" ON public.kpi_okr_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "kpi_okr_links_modify" ON public.kpi_okr_links FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

-- 13. RLS Policies for kpi_lineage_metadata
CREATE POLICY "kpi_lineage_select" ON public.kpi_lineage_metadata FOR SELECT TO authenticated USING (true);
CREATE POLICY "kpi_lineage_modify" ON public.kpi_lineage_metadata FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

-- 14. RLS Policies for personal_kpi_goals
CREATE POLICY "personal_goals_select" ON public.personal_kpi_goals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "personal_goals_modify" ON public.personal_kpi_goals FOR ALL TO authenticated USING (user_id = auth.uid());

-- 15. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_okr_objectives_owner ON public.okr_objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_okr_objectives_quarter ON public.okr_objectives(quarter, year);
CREATE INDEX IF NOT EXISTS idx_okr_key_results_objective ON public.okr_key_results(objective_id);
CREATE INDEX IF NOT EXISTS idx_kpi_okr_links_kpi ON public.kpi_okr_links(kpi_name);
CREATE INDEX IF NOT EXISTS idx_kpi_okr_links_kr ON public.kpi_okr_links(key_result_id);
CREATE INDEX IF NOT EXISTS idx_kpi_lineage_kpi ON public.kpi_lineage_metadata(kpi_name);
CREATE INDEX IF NOT EXISTS idx_personal_goals_user ON public.personal_kpi_goals(user_id);

-- 16. Update triggers for updated_at
DROP TRIGGER IF EXISTS update_okr_objectives_updated_at ON public.okr_objectives;
DROP TRIGGER IF EXISTS update_okr_key_results_updated_at ON public.okr_key_results;
DROP TRIGGER IF EXISTS update_kpi_lineage_metadata_updated_at ON public.kpi_lineage_metadata;
DROP TRIGGER IF EXISTS update_personal_kpi_goals_updated_at ON public.personal_kpi_goals;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_okr_objectives_updated_at
  BEFORE UPDATE ON public.okr_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_okr_key_results_updated_at
  BEFORE UPDATE ON public.okr_key_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpi_lineage_metadata_updated_at
  BEFORE UPDATE ON public.kpi_lineage_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_kpi_goals_updated_at
  BEFORE UPDATE ON public.personal_kpi_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
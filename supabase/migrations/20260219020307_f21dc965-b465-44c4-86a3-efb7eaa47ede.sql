
-- =============================================================================
-- Partner Organization Intelligence: 5 tables
-- =============================================================================

-- 1. company_people — Core people directory
CREATE TABLE public.company_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  linkedin_url text NOT NULL,
  linkedin_public_id text,
  full_name text,
  first_name text,
  last_name text,
  avatar_url text,
  current_title text,
  department_inferred text,
  seniority_level text,
  location text,
  headline text,
  skills text[],
  years_at_company numeric,
  total_experience_years numeric,
  work_history jsonb DEFAULT '[]'::jsonb,
  education jsonb DEFAULT '[]'::jsonb,
  is_decision_maker boolean DEFAULT false,
  is_still_active boolean DEFAULT true,
  employment_status text DEFAULT 'current',
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  departed_at timestamptz,
  departed_to_company text,
  departed_to_title text,
  profile_data_raw jsonb,
  matched_candidate_id uuid,
  data_legal_basis text DEFAULT 'legitimate_interest',
  enrichment_status text DEFAULT 'pending',
  enrichment_error text,
  last_refreshed_at timestamptz,
  auto_purge_at timestamptz,
  title_classification_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, linkedin_url)
);

-- 2. company_people_changes — Change detection log
CREATE TABLE public.company_people_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.company_people(id) ON DELETE SET NULL,
  change_type text NOT NULL, -- new_hire, departure, title_change, promotion
  old_value text,
  new_value text,
  detected_at timestamptz DEFAULT now(),
  is_reviewed boolean DEFAULT false,
  notes text,
  is_opportunity boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. company_scan_jobs — Scan tracking
CREATE TABLE public.company_scan_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- pending, discovering, listing, enriching, analyzing, completed, failed, paused
  total_employees_found integer DEFAULT 0,
  profiles_enriched integer DEFAULT 0,
  profiles_failed integer DEFAULT 0,
  changes_detected integer DEFAULT 0,
  credits_estimated integer DEFAULT 0,
  credits_used integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  triggered_by uuid,
  error_message text,
  scan_type text DEFAULT 'full', -- full, delta
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. company_scan_queue — Batch processing queue
CREATE TABLE public.company_scan_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id uuid NOT NULL REFERENCES public.company_scan_jobs(id) ON DELETE CASCADE,
  linkedin_url text NOT NULL,
  status text DEFAULT 'pending', -- pending, processing, completed, failed
  attempts integer DEFAULT 0,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- 5. proxycurl_credit_ledger — Credit tracking
CREATE TABLE public.proxycurl_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id uuid REFERENCES public.company_scan_jobs(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  endpoint_used text NOT NULL,
  credits_estimated integer DEFAULT 0,
  credits_actual integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX idx_company_people_company ON public.company_people(company_id);
CREATE INDEX idx_company_people_linkedin ON public.company_people(linkedin_url);
CREATE INDEX idx_company_people_status ON public.company_people(employment_status);
CREATE INDEX idx_company_people_department ON public.company_people(department_inferred);
CREATE INDEX idx_company_people_seniority ON public.company_people(seniority_level);
CREATE INDEX idx_company_people_active ON public.company_people(company_id, is_still_active);
CREATE INDEX idx_company_people_purge ON public.company_people(auto_purge_at) WHERE auto_purge_at IS NOT NULL;
CREATE INDEX idx_company_people_matched ON public.company_people(matched_candidate_id) WHERE matched_candidate_id IS NOT NULL;

CREATE INDEX idx_company_people_changes_company ON public.company_people_changes(company_id);
CREATE INDEX idx_company_people_changes_type ON public.company_people_changes(change_type);
CREATE INDEX idx_company_people_changes_detected ON public.company_people_changes(detected_at DESC);
CREATE INDEX idx_company_people_changes_unreviewed ON public.company_people_changes(company_id, is_reviewed) WHERE is_reviewed = false;

CREATE INDEX idx_company_scan_jobs_company ON public.company_scan_jobs(company_id);
CREATE INDEX idx_company_scan_jobs_status ON public.company_scan_jobs(status);

CREATE INDEX idx_company_scan_queue_job ON public.company_scan_queue(scan_job_id, status);
CREATE INDEX idx_company_scan_queue_pending ON public.company_scan_queue(scan_job_id) WHERE status = 'pending';

CREATE INDEX idx_proxycurl_credit_ledger_company ON public.proxycurl_credit_ledger(company_id);
CREATE INDEX idx_proxycurl_credit_ledger_month ON public.proxycurl_credit_ledger(created_at);

-- =============================================================================
-- RLS — Admin and Strategist only (using has_role pattern)
-- =============================================================================
ALTER TABLE public.company_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_people_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_scan_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proxycurl_credit_ledger ENABLE ROW LEVEL SECURITY;

-- company_people: admin + strategist read/write
CREATE POLICY "Admin full access to company_people"
  ON public.company_people FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Strategist read access to company_people"
  ON public.company_people FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- company_people_changes: admin + strategist read, admin write
CREATE POLICY "Admin full access to company_people_changes"
  ON public.company_people_changes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Strategist read access to company_people_changes"
  ON public.company_people_changes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- company_scan_jobs: admin only
CREATE POLICY "Admin full access to company_scan_jobs"
  ON public.company_scan_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- company_scan_queue: admin only
CREATE POLICY "Admin full access to company_scan_queue"
  ON public.company_scan_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- proxycurl_credit_ledger: admin only
CREATE POLICY "Admin full access to proxycurl_credit_ledger"
  ON public.proxycurl_credit_ledger FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- Auto-purge function (for GDPR compliance — removes stale data)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.purge_stale_company_people()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.company_people
  WHERE auto_purge_at IS NOT NULL
    AND auto_purge_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Updated_at trigger for company_people
CREATE TRIGGER update_company_people_updated_at
  BEFORE UPDATE ON public.company_people
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for company_scan_jobs
CREATE TRIGGER update_company_scan_jobs_updated_at
  BEFORE UPDATE ON public.company_scan_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set auto_purge_at when last_refreshed_at changes
CREATE OR REPLACE FUNCTION public.set_auto_purge_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.last_refreshed_at IS DISTINCT FROM OLD.last_refreshed_at THEN
    NEW.auto_purge_at := NEW.last_refreshed_at + interval '12 months';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_company_people_purge_date
  BEFORE UPDATE ON public.company_people
  FOR EACH ROW
  EXECUTE FUNCTION public.set_auto_purge_date();

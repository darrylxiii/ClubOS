
-- =============================================
-- Phase 1: Tag Taxonomy + Completeness Engine
-- =============================================

-- 1. Tag Definitions table
CREATE TABLE public.candidate_tag_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('seniority', 'function', 'industry', 'availability', 'quality', 'source', 'custom')),
  color text NOT NULL DEFAULT '#3b82f6',
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, category)
);

-- 2. Tag Assignments table
CREATE TABLE public.candidate_tag_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.candidate_tag_definitions(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, tag_id)
);

-- Indexes
CREATE INDEX idx_tag_assignments_candidate ON public.candidate_tag_assignments(candidate_id);
CREATE INDEX idx_tag_assignments_tag ON public.candidate_tag_assignments(tag_id);
CREATE INDEX idx_tag_definitions_category ON public.candidate_tag_definitions(category);

-- 3. RLS
ALTER TABLE public.candidate_tag_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Tag definitions: readable by all authenticated, writable by admins/strategists
CREATE POLICY "Authenticated users can read tag definitions"
  ON public.candidate_tag_definitions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and strategists can manage tag definitions"
  ON public.candidate_tag_definitions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

-- Tag assignments: readable by authenticated, writable by admins/strategists
CREATE POLICY "Authenticated users can read tag assignments"
  ON public.candidate_tag_assignments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and strategists can manage tag assignments"
  ON public.candidate_tag_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

-- 4. Profile Completeness Function
CREATE OR REPLACE FUNCTION public.calculate_candidate_completeness(p_candidate_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
  v_candidate candidate_profiles%ROWTYPE;
  v_skills_count integer;
  v_experience_count integer;
  v_education_count integer;
  v_documents_count integer;
  v_tags_count integer;
BEGIN
  SELECT * INTO v_candidate FROM candidate_profiles WHERE id = p_candidate_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Core Identity (max 18)
  IF v_candidate.full_name IS NOT NULL AND v_candidate.full_name != '' THEN v_score := v_score + 5; END IF;
  IF v_candidate.email IS NOT NULL AND v_candidate.email != '' THEN v_score := v_score + 5; END IF;
  IF v_candidate.phone IS NOT NULL AND v_candidate.phone != '' THEN v_score := v_score + 3; END IF;
  IF v_candidate.linkedin_url IS NOT NULL AND v_candidate.linkedin_url != '' THEN v_score := v_score + 5; END IF;

  -- Professional Context (max 15)
  IF v_candidate.current_title IS NOT NULL AND v_candidate.current_title != '' THEN v_score := v_score + 5; END IF;
  IF v_candidate.current_company IS NOT NULL AND v_candidate.current_company != '' THEN v_score := v_score + 5; END IF;
  IF v_candidate.years_of_experience IS NOT NULL AND v_candidate.years_of_experience > 0 THEN v_score := v_score + 5; END IF;

  -- Skills (max 10)
  SELECT COUNT(*) INTO v_skills_count FROM profile_skills WHERE user_id = v_candidate.user_id;
  IF v_skills_count >= 5 THEN v_score := v_score + 10;
  ELSIF v_skills_count >= 3 THEN v_score := v_score + 7;
  ELSIF v_skills_count >= 1 THEN v_score := v_score + 4;
  END IF;

  -- Work History (max 10)
  SELECT COUNT(*) INTO v_experience_count FROM profile_experience WHERE user_id = v_candidate.user_id;
  IF v_experience_count >= 2 THEN v_score := v_score + 10;
  ELSIF v_experience_count >= 1 THEN v_score := v_score + 6;
  END IF;

  -- Education (max 5)
  SELECT COUNT(*) INTO v_education_count FROM profile_education WHERE user_id = v_candidate.user_id;
  IF v_education_count >= 1 THEN v_score := v_score + 5; END IF;

  -- Compensation (max 8)
  IF v_candidate.current_salary IS NOT NULL AND v_candidate.current_salary > 0 THEN v_score := v_score + 4; END IF;
  IF v_candidate.salary_expectation IS NOT NULL AND v_candidate.salary_expectation > 0 THEN v_score := v_score + 4; END IF;

  -- Resume (max 10)
  IF v_candidate.resume_url IS NOT NULL AND v_candidate.resume_url != '' THEN v_score := v_score + 10; END IF;

  -- Notice Period (max 5)
  IF v_candidate.notice_period IS NOT NULL AND v_candidate.notice_period != '' THEN v_score := v_score + 5; END IF;

  -- Location / Work Preferences (max 5)
  IF v_candidate.preferred_locations IS NOT NULL AND array_length(v_candidate.preferred_locations, 1) > 0 THEN v_score := v_score + 3; END IF;
  IF v_candidate.work_authorization IS NOT NULL AND v_candidate.work_authorization != '' THEN v_score := v_score + 2; END IF;

  -- Tags (max 5)
  SELECT COUNT(*) INTO v_tags_count FROM candidate_tag_assignments WHERE candidate_id = p_candidate_id;
  IF v_tags_count >= 3 THEN v_score := v_score + 5;
  ELSIF v_tags_count >= 1 THEN v_score := v_score + 3;
  END IF;

  -- AI Summary (max 4)
  IF v_candidate.ai_summary IS NOT NULL AND v_candidate.ai_summary != '' THEN v_score := v_score + 4; END IF;

  -- Cap at 100
  RETURN LEAST(v_score, 100);
END;
$$;

-- 5. Auto-update completeness on candidate_profiles change
CREATE OR REPLACE FUNCTION public.trigger_update_candidate_completeness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE candidate_profiles
  SET profile_completeness = calculate_candidate_completeness(NEW.id),
      updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_candidate_completeness_update
  AFTER INSERT OR UPDATE ON public.candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_candidate_completeness();

-- Also recalculate when tags are assigned/removed
CREATE OR REPLACE FUNCTION public.trigger_update_completeness_on_tag_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_candidate_id := OLD.candidate_id;
  ELSE
    v_candidate_id := NEW.candidate_id;
  END IF;

  UPDATE candidate_profiles
  SET profile_completeness = calculate_candidate_completeness(v_candidate_id),
      updated_at = now()
  WHERE id = v_candidate_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_completeness_on_tag_change
  AFTER INSERT OR DELETE ON public.candidate_tag_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_completeness_on_tag_change();

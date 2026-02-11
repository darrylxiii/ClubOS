
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
  v_tags_count integer;
BEGIN
  SELECT * INTO v_candidate FROM candidate_profiles WHERE id = p_candidate_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_candidate.full_name IS NOT NULL AND v_candidate.full_name != '' THEN v_score := v_score + 5; END IF;
  IF v_candidate.email IS NOT NULL AND v_candidate.email != '' THEN v_score := v_score + 5; END IF;
  IF v_candidate.phone IS NOT NULL AND v_candidate.phone != '' THEN v_score := v_score + 3; END IF;
  IF v_candidate.linkedin_url IS NOT NULL AND v_candidate.linkedin_url != '' THEN v_score := v_score + 5; END IF;

  IF v_candidate.current_title IS NOT NULL AND v_candidate.current_title != '' THEN v_score := v_score + 5; END IF;
  IF v_candidate.current_company IS NOT NULL AND v_candidate.current_company != '' THEN v_score := v_score + 5; END IF;
  IF v_candidate.years_of_experience IS NOT NULL AND v_candidate.years_of_experience > 0 THEN v_score := v_score + 5; END IF;

  SELECT COUNT(*) INTO v_skills_count FROM profile_skills WHERE user_id = v_candidate.user_id;
  IF v_skills_count >= 5 THEN v_score := v_score + 10;
  ELSIF v_skills_count >= 3 THEN v_score := v_score + 7;
  ELSIF v_skills_count >= 1 THEN v_score := v_score + 4;
  END IF;

  IF v_candidate.current_salary_min IS NOT NULL AND v_candidate.current_salary_min > 0 THEN v_score := v_score + 4; END IF;
  IF v_candidate.desired_salary_min IS NOT NULL AND v_candidate.desired_salary_min > 0 THEN v_score := v_score + 4; END IF;

  IF v_candidate.resume_url IS NOT NULL AND v_candidate.resume_url != '' THEN v_score := v_score + 10; END IF;

  IF v_candidate.notice_period IS NOT NULL AND v_candidate.notice_period != '' THEN v_score := v_score + 5; END IF;

  -- desired_locations and work_authorization are jsonb
  IF v_candidate.desired_locations IS NOT NULL AND v_candidate.desired_locations != 'null'::jsonb AND jsonb_typeof(v_candidate.desired_locations) = 'array' AND jsonb_array_length(v_candidate.desired_locations) > 0 THEN v_score := v_score + 3; END IF;
  IF v_candidate.work_authorization IS NOT NULL AND v_candidate.work_authorization != 'null'::jsonb AND v_candidate.work_authorization != '""'::jsonb THEN v_score := v_score + 2; END IF;

  SELECT COUNT(*) INTO v_tags_count FROM candidate_tag_assignments WHERE candidate_id = p_candidate_id;
  IF v_tags_count >= 3 THEN v_score := v_score + 5;
  ELSIF v_tags_count >= 1 THEN v_score := v_score + 3;
  END IF;

  IF v_candidate.ai_summary IS NOT NULL AND v_candidate.ai_summary != '' THEN v_score := v_score + 4; END IF;

  RETURN LEAST(v_score, 100);
END;
$$;

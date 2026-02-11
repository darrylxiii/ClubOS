
-- Drop the self-referencing trigger that causes infinite recursion
DROP TRIGGER IF EXISTS trg_candidate_completeness_update ON public.candidate_profiles;

-- Replace with a trigger that only recalculates on specific column changes, not on profile_completeness itself
CREATE OR REPLACE FUNCTION public.trigger_update_candidate_completeness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if only profile_completeness or updated_at changed (avoid recursion)
  IF TG_OP = 'UPDATE' AND
     OLD.full_name IS NOT DISTINCT FROM NEW.full_name AND
     OLD.email IS NOT DISTINCT FROM NEW.email AND
     OLD.phone IS NOT DISTINCT FROM NEW.phone AND
     OLD.linkedin_url IS NOT DISTINCT FROM NEW.linkedin_url AND
     OLD.current_title IS NOT DISTINCT FROM NEW.current_title AND
     OLD.current_company IS NOT DISTINCT FROM NEW.current_company AND
     OLD.years_of_experience IS NOT DISTINCT FROM NEW.years_of_experience AND
     OLD.current_salary_min IS NOT DISTINCT FROM NEW.current_salary_min AND
     OLD.desired_salary_min IS NOT DISTINCT FROM NEW.desired_salary_min AND
     OLD.resume_url IS NOT DISTINCT FROM NEW.resume_url AND
     OLD.notice_period IS NOT DISTINCT FROM NEW.notice_period AND
     OLD.desired_locations IS NOT DISTINCT FROM NEW.desired_locations AND
     OLD.work_authorization IS NOT DISTINCT FROM NEW.work_authorization AND
     OLD.ai_summary IS NOT DISTINCT FROM NEW.ai_summary
  THEN
    RETURN NEW;
  END IF;

  NEW.profile_completeness := calculate_candidate_completeness(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_candidate_completeness_update
  BEFORE INSERT OR UPDATE ON public.candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_candidate_completeness();

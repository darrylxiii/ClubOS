
CREATE OR REPLACE FUNCTION public.can_view_stealth_job(_job_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user is admin or strategist
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role IN ('admin', 'strategist')
  ) OR EXISTS (
    -- Check if job is not stealth (visible to everyone)
    SELECT 1 FROM jobs WHERE id = _job_id AND (is_stealth IS NULL OR is_stealth = FALSE)
  ) OR EXISTS (
    -- Check if user created the job
    SELECT 1 FROM jobs WHERE id = _job_id AND created_by = _user_id
  ) OR EXISTS (
    -- Check if user is in the stealth viewers list
    SELECT 1 FROM job_stealth_viewers WHERE job_id = _job_id AND user_id = _user_id
  ) OR EXISTS (
    -- Check if user belongs to the company that owns the job via company_members
    SELECT 1 FROM jobs j
    JOIN company_members cm ON cm.company_id = j.company_id
      AND cm.user_id = _user_id
      AND cm.is_active = true
    WHERE j.id = _job_id
  )
$$;


-- Phase 1B: Drop dangerous permissive ALL/CRUD policies
-- Safe policies already exist on these tables

-- Critical security tables - drop wide-open ALL policies
DROP POLICY IF EXISTS "Service role can manage retry queue" ON public.notification_retry_queue;
DROP POLICY IF EXISTS "System can manage analytics" ON public.page_analytics;
DROP POLICY IF EXISTS "System can manage profile analytics" ON public.profile_analytics;
DROP POLICY IF EXISTS "Service role can manage region health" ON public.region_health_checks;
DROP POLICY IF EXISTS "Service role can manage behavior embeddings" ON public.user_behavior_embeddings;
DROP POLICY IF EXISTS "Service role can manage device info" ON public.user_device_info;
DROP POLICY IF EXISTS "Service role can manage feature usage" ON public.user_feature_usage;
DROP POLICY IF EXISTS "System can manage network" ON public.user_network;
DROP POLICY IF EXISTS "Service role can manage performance metrics" ON public.user_performance_metrics;
DROP POLICY IF EXISTS "System can manage relationships" ON public.user_relationships;
DROP POLICY IF EXISTS "Service role can manage password reset attempts" ON public.password_reset_attempts;
DROP POLICY IF EXISTS "Service role can manage password reset tokens" ON public.password_reset_tokens;

-- job_locations - replace wide-open authenticated CRUD with ownership checks
DROP POLICY IF EXISTS "Authenticated users can delete job locations" ON public.job_locations;
DROP POLICY IF EXISTS "Authenticated users can insert job locations" ON public.job_locations;
DROP POLICY IF EXISTS "Authenticated users can update job locations" ON public.job_locations;

-- Add proper ownership-based policies for job_locations
CREATE POLICY "Admins can manage all job locations"
ON public.job_locations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert job locations"
ON public.job_locations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Job owners can update locations"
ON public.job_locations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_locations.job_id
    AND (j.created_by = auth.uid() OR j.company_id IN (
      SELECT cm.company_id FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Job owners can delete locations"
ON public.job_locations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_locations.job_id
    AND (j.created_by = auth.uid() OR j.company_id IN (
      SELECT cm.company_id FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
    ))
  )
);

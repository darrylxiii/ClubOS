-- Phase 3: Analytics and Rate Limiting Tables - Service Role Only

-- ai_rate_limits - service role only
DROP POLICY IF EXISTS "Allow insert for rate limiting" ON public.ai_rate_limits;
DROP POLICY IF EXISTS "Allow update for rate limiting" ON public.ai_rate_limits;
CREATE POLICY "Service role only for ai_rate_limits"
ON public.ai_rate_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- api_rate_limits - service role only
DROP POLICY IF EXISTS "Allow insert for API rate limiting" ON public.api_rate_limits;
DROP POLICY IF EXISTS "Allow update for API rate limiting" ON public.api_rate_limits;
CREATE POLICY "Service role only for api_rate_limits"
ON public.api_rate_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- conversation_analytics - service role only
DROP POLICY IF EXISTS "Authenticated users can manage conversation analytics" ON public.conversation_analytics;
CREATE POLICY "Service role only for conversation_analytics"
ON public.conversation_analytics
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- page_analytics - service role only
DROP POLICY IF EXISTS "Authenticated users can manage page analytics" ON public.page_analytics;
CREATE POLICY "Service role only for page_analytics"
ON public.page_analytics
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- profile_analytics - service role only
DROP POLICY IF EXISTS "Authenticated users can manage profile analytics" ON public.profile_analytics;
CREATE POLICY "Service role only for profile_analytics"
ON public.profile_analytics
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- partner_engagement_metrics - service role only
DROP POLICY IF EXISTS "Authenticated users can manage partner metrics" ON public.partner_engagement_metrics;
CREATE POLICY "Service role only for partner_engagement_metrics"
ON public.partner_engagement_metrics
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- skills_demand_metrics - service role only
DROP POLICY IF EXISTS "Authenticated users can manage skills metrics" ON public.skills_demand_metrics;
CREATE POLICY "Service role only for skills_demand_metrics"
ON public.skills_demand_metrics
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- user_behavior_embeddings - service role only
DROP POLICY IF EXISTS "Authenticated users can manage embeddings" ON public.user_behavior_embeddings;
CREATE POLICY "Service role only for user_behavior_embeddings"
ON public.user_behavior_embeddings
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- user_feature_usage - service role only
DROP POLICY IF EXISTS "Authenticated users can manage feature usage" ON public.user_feature_usage;
CREATE POLICY "Service role only for user_feature_usage"
ON public.user_feature_usage
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- user_performance_metrics - service role only
DROP POLICY IF EXISTS "Authenticated users can manage performance metrics" ON public.user_performance_metrics;
CREATE POLICY "Service role only for user_performance_metrics"
ON public.user_performance_metrics
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- brand_assets_cache - service role only
DROP POLICY IF EXISTS "Authenticated users can manage brand assets cache" ON public.brand_assets_cache;
CREATE POLICY "Service role only for brand_assets_cache"
ON public.brand_assets_cache
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- candidate_activity_metrics - service role only
DROP POLICY IF EXISTS "Authenticated users can manage candidate metrics" ON public.candidate_activity_metrics;
CREATE POLICY "Service role only for candidate_activity_metrics"
ON public.candidate_activity_metrics
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
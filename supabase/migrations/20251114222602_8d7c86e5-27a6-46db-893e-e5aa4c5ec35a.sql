-- Fix security issues from previous migration

-- 1. Enable RLS on skills_demand_metrics table
ALTER TABLE skills_demand_metrics ENABLE ROW LEVEL SECURITY;

-- Allow public read access to skills demand metrics (read-only data)
CREATE POLICY "Allow public read access to skills demand metrics"
  ON skills_demand_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow service role to update skills demand metrics (via edge functions)
CREATE POLICY "Allow service role to manage skills demand metrics"
  ON skills_demand_metrics
  FOR ALL
  TO service_role
  USING (true);

-- 2. Restrict access to popular_courses materialized view
-- Revoke all access from anon and authenticated by default
REVOKE ALL ON popular_courses FROM anon, authenticated;

-- Grant only SELECT permission to authenticated users
GRANT SELECT ON popular_courses TO authenticated;
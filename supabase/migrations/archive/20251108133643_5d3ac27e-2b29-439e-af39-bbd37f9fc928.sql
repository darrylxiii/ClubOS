-- Fix api_rate_limits RLS policies to prevent permission errors
-- Allow authenticated users to read rate limits
CREATE POLICY "Users can view rate limits"
  ON api_rate_limits
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow system to manage rate limits
CREATE POLICY "System can manage rate limits"
  ON api_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
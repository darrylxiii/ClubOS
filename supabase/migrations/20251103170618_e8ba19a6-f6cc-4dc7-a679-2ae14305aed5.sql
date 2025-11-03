-- Fix overly permissive RLS policy on ai_rate_limits table
-- This table should only be accessed by edge functions with service role, not by clients

-- Drop the overly permissive policy that allows any authenticated user full access
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.ai_rate_limits;

-- The table now has no policies, which means:
-- - Regular users (with anon/authenticated key) have NO access (secure default)
-- - Edge functions using service role key can still access it (bypass RLS)
-- This is the correct security model for rate limiting infrastructure
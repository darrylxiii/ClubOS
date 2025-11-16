-- Fix Security Definer View: member_requests_unified
-- Set security_invoker to true to enforce RLS policies of the querying user

ALTER VIEW public.member_requests_unified SET (security_invoker = true);

-- Add comment documenting the security fix
COMMENT ON VIEW public.member_requests_unified IS 
'Unified view of candidate and partner member requests. Uses security_invoker=true to enforce RLS policies of the querying user rather than the view creator.';
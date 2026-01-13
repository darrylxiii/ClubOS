-- Fix function search paths for security
ALTER FUNCTION public.calculate_referral_rankings(TEXT) SET search_path = public;
ALTER FUNCTION public.get_user_referral_tier(UUID) SET search_path = public;
ALTER FUNCTION public.get_active_referral_challenges() SET search_path = public;
ALTER FUNCTION public.log_referral_activity() SET search_path = public;
-- Remove duplicate profile creation trigger that conflicts with handle_new_user()
-- This fixes signup failures caused by two triggers trying to create the same profile

DROP TRIGGER IF EXISTS on_auth_user_created_ensure_profile ON auth.users;
DROP FUNCTION IF EXISTS public.ensure_profile_on_signup();

-- The handle_new_user() trigger remains active and handles BOTH:
-- 1. Profile creation with error resilience (ON CONFLICT DO NOTHING)
-- 2. Default 'user' role assignment
-- This ensures single, reliable signup flow
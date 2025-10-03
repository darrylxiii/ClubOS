-- Add partner to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

-- Ensure partner role can be assigned in user_roles
-- (The table already exists, just making sure the constraint allows partner)
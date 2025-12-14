-- Phase 1A: God Mode Admin Capabilities - Schema Setup

-- 1. Add account_status enum type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status_enum') THEN
    CREATE TYPE public.account_status_enum AS ENUM ('active', 'suspended', 'banned', 'pending_review', 'read_only');
  END IF;
END $$;

-- 2. Add super_admin to app_role enum if not exists
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 3. Add account status columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status public.account_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS force_password_reset_reason TEXT,
ADD COLUMN IF NOT EXISTS force_password_reset_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS force_password_reset_at TIMESTAMPTZ;

-- 4. Create admin_account_actions table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_account_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('suspend', 'unsuspend', 'ban', 'unban', 'force_password_reset', 'clear_password_reset', 'set_read_only', 'activate', 'promote_super_admin', 'demote_super_admin')),
  reason TEXT,
  previous_status public.account_status_enum,
  new_status public.account_status_enum,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS on admin_account_actions
ALTER TABLE public.admin_account_actions ENABLE ROW LEVEL SECURITY;

-- 6. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_force_password_reset ON public.profiles(force_password_reset) WHERE force_password_reset = true;
CREATE INDEX IF NOT EXISTS idx_admin_account_actions_target ON public.admin_account_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_account_actions_admin ON public.admin_account_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_account_actions_created ON public.admin_account_actions(created_at DESC);
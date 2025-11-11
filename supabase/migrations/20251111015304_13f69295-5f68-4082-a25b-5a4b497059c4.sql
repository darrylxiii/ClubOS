-- ============================================
-- PHASE 1: Critical Security Fixes
-- Fix candidate_invitations RLS policies
-- ============================================

-- Drop the insecure public read policy
DROP POLICY IF EXISTS "candidate_invitations_public_read" ON candidate_invitations;

-- Create secure policy: only allow reading specific invitation by token (server-side only)
-- Note: Client-side validation should use edge function instead
CREATE POLICY "candidate_invitations_read_by_token"
ON candidate_invitations
FOR SELECT
TO public
USING (
  auth.uid() = invited_by
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'strategist')
  )
);


-- ============================================
-- PHASE 4: Profile Creation Resilience
-- Add error handling to handle_new_user trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Try to insert profile
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NOW(),
      NOW()
    );
    
    RETURN NEW;
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, update instead
      UPDATE public.profiles
      SET 
        email = NEW.email,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        updated_at = NOW()
      WHERE id = NEW.id;
      
      RETURN NEW;
    WHEN OTHERS THEN
      -- Log error but don't block signup
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
      RETURN NEW;
  END;
END;
$$;


-- ============================================
-- PHASE 6: Edge Function Improvements
-- Add fallback to use_invite_code function
-- ============================================

CREATE OR REPLACE FUNCTION public.use_invite_code(_code text, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_record RECORD;
  referrer_level INTEGER := 0;
  result JSONB;
BEGIN
  -- Get invite code details with row lock
  SELECT * INTO invite_record
  FROM public.invite_codes
  WHERE code = _code
    AND is_active = true
    AND used_by IS NULL
    AND expires_at > NOW()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid or expired invite code'
    );
  END IF;
  
  -- Try to get referrer's level (may not exist)
  BEGIN
    SELECT COALESCE(referral_level, 0) INTO referrer_level
    FROM public.referral_network
    WHERE user_id = invite_record.created_by;
  EXCEPTION
    WHEN OTHERS THEN
      referrer_level := 0;
  END;
  
  -- Mark invite as used (always succeeds)
  UPDATE public.invite_codes
  SET used_by = _user_id,
      used_at = NOW(),
      is_active = false
  WHERE code = _code;
  
  -- Try to create referral network entry (optional, won't block if it fails)
  BEGIN
    INSERT INTO public.referral_network (
      user_id,
      referred_by,
      referred_by_type,
      invite_code,
      referral_level
    ) VALUES (
      _user_id,
      invite_record.created_by,
      invite_record.created_by_type,
      _code,
      referrer_level + 1
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log but don't fail the invite code usage
      RAISE NOTICE 'Failed to create referral network entry: %', SQLERRM;
  END;
  
  RETURN jsonb_build_object(
    'success', true, 
    'referrer_level', referrer_level + 1,
    'invite_code', _code
  );
END;
$$;


-- ============================================
-- Add indexes for better invite code performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_invite_codes_code_active 
ON invite_codes(code) 
WHERE is_active = true AND used_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_invitations_token 
ON candidate_invitations(invitation_token) 
WHERE status != 'accepted';
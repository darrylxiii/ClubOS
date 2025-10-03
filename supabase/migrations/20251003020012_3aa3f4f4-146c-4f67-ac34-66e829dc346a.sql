-- Create invite_codes table for tracking referral invites
CREATE TABLE public.invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_type TEXT NOT NULL CHECK (created_by_type IN ('member', 'recruiter')),
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create referral_network table to track the complete chain
CREATE TABLE public.referral_network (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_by_type TEXT CHECK (referred_by_type IN ('member', 'recruiter')),
  invite_code TEXT REFERENCES public.invite_codes(code),
  referral_level INTEGER NOT NULL DEFAULT 1,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_network ENABLE ROW LEVEL SECURITY;

-- Users can view their own invite codes
CREATE POLICY "Users can view their own invite codes"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Users can create their own invite codes (limited by function)
CREATE POLICY "Users can create invite codes"
ON public.invite_codes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Users can update their own invite codes
CREATE POLICY "Users can update their own invite codes"
ON public.invite_codes
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Admins/recruiters can view all invite codes
CREATE POLICY "Admins can view all invite codes"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their referral network
CREATE POLICY "Users can view their referral info"
ON public.referral_network
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = referred_by);

-- System can insert referral records
CREATE POLICY "System can insert referral records"
ON public.referral_network
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can view all referral networks
CREATE POLICY "Admins can view all referrals"
ON public.referral_network
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to generate unique invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.invite_codes WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create function to check invite code limit (5 per user)
CREATE OR REPLACE FUNCTION public.check_invite_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Count active unused invites for this user
  SELECT COUNT(*) INTO active_count
  FROM public.invite_codes
  WHERE created_by = NEW.created_by
    AND used_by IS NULL
    AND is_active = true
    AND expires_at > NOW();
  
  IF active_count >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 active invite codes allowed per user';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce invite limit
CREATE TRIGGER enforce_invite_limit
BEFORE INSERT ON public.invite_codes
FOR EACH ROW
EXECUTE FUNCTION public.check_invite_limit();

-- Create function to handle invite code usage
CREATE OR REPLACE FUNCTION public.use_invite_code(_code TEXT, _user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  referrer_level INTEGER;
  result JSONB;
BEGIN
  -- Get invite code details
  SELECT * INTO invite_record
  FROM public.invite_codes
  WHERE code = _code
    AND is_active = true
    AND used_by IS NULL
    AND expires_at > NOW()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite code');
  END IF;
  
  -- Get referrer's level
  SELECT COALESCE(referral_level, 0) INTO referrer_level
  FROM public.referral_network
  WHERE user_id = invite_record.created_by;
  
  -- Mark invite as used
  UPDATE public.invite_codes
  SET used_by = _user_id,
      used_at = NOW(),
      is_active = false
  WHERE code = _code;
  
  -- Create referral network entry
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
  );
  
  RETURN jsonb_build_object('success', true, 'referrer_level', referrer_level + 1);
END;
$$;

-- Create triggers
CREATE TRIGGER update_invite_codes_updated_at
BEFORE UPDATE ON public.invite_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_invite_codes_created_by ON public.invite_codes(created_by);
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX idx_invite_codes_active ON public.invite_codes(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_referral_network_user ON public.referral_network(user_id);
CREATE INDEX idx_referral_network_referrer ON public.referral_network(referred_by);
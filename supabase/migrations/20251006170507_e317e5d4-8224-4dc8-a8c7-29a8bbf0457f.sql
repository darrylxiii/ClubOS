-- Enhanced waitlist table with segmentation and rich data
ALTER TABLE public.waitlist 
  ADD COLUMN IF NOT EXISTS applicant_type TEXT DEFAULT 'talent' CHECK (applicant_type IN ('talent', 'partner', 'referrer', 'vip')),
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS expertise TEXT,
  ADD COLUMN IF NOT EXISTS goals TEXT,
  ADD COLUMN IF NOT EXISTS elevator_pitch TEXT,
  ADD COLUMN IF NOT EXISTS video_intro_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS seniority TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
  ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_feedback TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update status check constraint
ALTER TABLE public.waitlist DROP CONSTRAINT IF EXISTS waitlist_status_check;
ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_status_check 
  CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'waitlisted'));

-- Create referral tracking table
CREATE TABLE IF NOT EXISTS public.waitlist_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.waitlist(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_joined_id UUID REFERENCES public.waitlist(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'joined', 'approved')),
  reward_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist_referrals ENABLE ROW LEVEL SECURITY;

-- Referral policies
CREATE POLICY "Users can view their own referrals"
  ON public.waitlist_referrals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.waitlist 
      WHERE id = waitlist_referrals.referrer_id 
      AND email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Anyone can create referrals"
  ON public.waitlist_referrals
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage referrals"
  ON public.waitlist_referrals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create waitlist analytics table
CREATE TABLE IF NOT EXISTS public.waitlist_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_submissions INTEGER DEFAULT 0,
  by_type JSONB DEFAULT '{}'::jsonb,
  by_industry JSONB DEFAULT '{}'::jsonb,
  by_location JSONB DEFAULT '{}'::jsonb,
  by_source JSONB DEFAULT '{}'::jsonb,
  approval_rate DECIMAL(5,2),
  avg_priority_score DECIMAL(5,2),
  total_referrals INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date)
);

-- Enable RLS
ALTER TABLE public.waitlist_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analytics"
  ON public.waitlist_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create waitlist engagement tracking
CREATE TABLE IF NOT EXISTS public.waitlist_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id UUID REFERENCES public.waitlist(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create engagement events"
  ON public.waitlist_engagement
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view engagement"
  ON public.waitlist_engagement
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
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
    new_code := 'QC-' || upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.waitlist WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Create trigger to auto-generate referral codes
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_type ON public.waitlist(applicant_type);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON public.waitlist(referral_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_referred_by ON public.waitlist(referred_by_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_priority ON public.waitlist(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.waitlist_referrals(referrer_id);

-- Update admin view policy to include new fields
DROP POLICY IF EXISTS "Admins can view all waitlist entries" ON public.waitlist;
CREATE POLICY "Admins can view all waitlist entries"
  ON public.waitlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update waitlist entries" ON public.waitlist;
CREATE POLICY "Admins can update waitlist entries"
  ON public.waitlist
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
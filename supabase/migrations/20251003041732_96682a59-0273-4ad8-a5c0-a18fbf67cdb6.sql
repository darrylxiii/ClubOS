-- Create referral metadata table to store pre-filled referral information
CREATE TABLE public.referral_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID REFERENCES public.invite_codes(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  friend_name TEXT,
  friend_email TEXT,
  friend_linkedin TEXT,
  friend_current_role TEXT,
  friend_current_company TEXT,
  referrer_notes TEXT,
  why_good_fit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days') NOT NULL
);

-- Enable RLS
ALTER TABLE public.referral_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for referral metadata
CREATE POLICY "Users can create their own referral metadata"
  ON public.referral_metadata
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invite_codes
      WHERE id = referral_metadata.invite_code_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view their own referral metadata"
  ON public.referral_metadata
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invite_codes
      WHERE id = referral_metadata.invite_code_id
      AND (created_by = auth.uid() OR used_by = auth.uid())
    )
  );

CREATE POLICY "Admins can view all referral metadata"
  ON public.referral_metadata
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Add index for better query performance
CREATE INDEX idx_referral_metadata_invite_code ON public.referral_metadata(invite_code_id);
CREATE INDEX idx_referral_metadata_expires_at ON public.referral_metadata(expires_at);
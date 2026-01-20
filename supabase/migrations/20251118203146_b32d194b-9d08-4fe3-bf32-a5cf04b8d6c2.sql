-- Add missing auto_tracked column to company_email_domains to match auto_track_partner_email_domain trigger
ALTER TABLE public.company_email_domains
ADD COLUMN IF NOT EXISTS auto_tracked boolean DEFAULT false;

-- Backfill existing rows as non-auto-tracked
UPDATE public.company_email_domains
SET auto_tracked = COALESCE(auto_tracked, false);
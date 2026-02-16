
-- Add LinkedIn profile enrichment columns and credential storage to avatar accounts
ALTER TABLE public.linkedin_avatar_accounts
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS connections_count integer,
  ADD COLUMN IF NOT EXISTS followers_count integer,
  ADD COLUMN IF NOT EXISTS linkedin_headline text,
  ADD COLUMN IF NOT EXISTS linkedin_password_encrypted text,
  ADD COLUMN IF NOT EXISTS email_account_address text,
  ADD COLUMN IF NOT EXISTS email_account_password_encrypted text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Ensure pgcrypto is available for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

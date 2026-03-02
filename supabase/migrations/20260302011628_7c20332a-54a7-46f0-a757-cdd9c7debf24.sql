-- Add connection request quota columns
ALTER TABLE public.linkedin_avatar_accounts
  ADD COLUMN IF NOT EXISTS weekly_connection_limit integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS weekly_connections_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_connections_reset_at timestamptz NOT NULL DEFAULT now();

-- Enable pg_cron extension for scheduled reset
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
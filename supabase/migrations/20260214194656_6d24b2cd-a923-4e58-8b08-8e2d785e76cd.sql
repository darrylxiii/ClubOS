-- Add snoozed_until column to crm_email_replies for snooze persistence
ALTER TABLE public.crm_email_replies 
ADD COLUMN IF NOT EXISTS snoozed_until timestamptz DEFAULT NULL;
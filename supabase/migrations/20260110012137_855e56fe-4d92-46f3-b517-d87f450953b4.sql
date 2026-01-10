-- Enterprise Grade RLS Hardening - Batch 5 (fixed)

-- booking_slot_analytics - fix ALL policy
DROP POLICY IF EXISTS "Allow anonymous operations on slot analytics" ON public.booking_slot_analytics;

-- booking_reminder_logs - fix
DROP POLICY IF EXISTS "Service role can manage reminder logs" ON public.booking_reminder_logs;

-- booking_reminders - fix
DROP POLICY IF EXISTS "Service role can manage reminders" ON public.booking_reminders;

-- brand_assets_cache - fix
DROP POLICY IF EXISTS "Service role can manage brand assets cache" ON public.brand_assets_cache;

-- calendar_sync_log - fix
DROP POLICY IF EXISTS "Service role can manage sync logs" ON public.calendar_sync_log;

-- candidate_activity_metrics - fix
DROP POLICY IF EXISTS "Service role can manage candidate metrics" ON public.candidate_activity_metrics;

-- admin_audit_activity - fix
DROP POLICY IF EXISTS "Service role can manage admin audit" ON public.admin_audit_activity;

-- backup_policies - fix old policy name
DROP POLICY IF EXISTS "Service role can manage backup policies" ON public.backup_policies;
-- Scheduling audit P0 foundations: calendar selection, anti-abuse rate limits, host display mode

-- 1) Store per-connection calendar IDs (to support "check all calendars")
ALTER TABLE public.calendar_connections
ADD COLUMN IF NOT EXISTS calendar_ids text[] NULL,
ADD COLUMN IF NOT EXISTS calendar_ids_synced_at timestamptz NULL;

-- 2) Public booking display policy per booking link
ALTER TABLE public.booking_links
ADD COLUMN IF NOT EXISTS host_display_mode text NOT NULL DEFAULT 'full';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_links_host_display_mode_check'
  ) THEN
    ALTER TABLE public.booking_links
    ADD CONSTRAINT booking_links_host_display_mode_check
    CHECK (host_display_mode IN ('full','discreet','avatar_only','name_only'));
  END IF;
END $$;

-- 3) Anti-abuse: IP-based rate limiting log (queried only server-side)
CREATE TABLE IF NOT EXISTS public.booking_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  ip_hash text NOT NULL,
  guest_email text NULL,
  booking_link_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_rate_limits_action_ip_created_at_idx
  ON public.booking_rate_limits (action, ip_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS booking_rate_limits_booking_link_created_at_idx
  ON public.booking_rate_limits (booking_link_id, created_at DESC);

ALTER TABLE public.booking_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies: client access denied by default; backend uses service role key.

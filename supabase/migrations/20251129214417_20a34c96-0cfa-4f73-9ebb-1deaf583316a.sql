-- Phase 1: Enable realtime and add cleanup for existing webrtc_signals table

-- Enable realtime for the signals table (safe to run multiple times)
DO $$ 
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'webrtc_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;
  END IF;
END $$;

-- Auto-cleanup function: delete signals older than 60 seconds
CREATE OR REPLACE FUNCTION cleanup_old_webrtc_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.webrtc_signals
  WHERE created_at < NOW() - INTERVAL '60 seconds';
END;
$$;

COMMENT ON FUNCTION cleanup_old_webrtc_signals IS 'Deletes WebRTC signals older than 60 seconds to keep table lean';
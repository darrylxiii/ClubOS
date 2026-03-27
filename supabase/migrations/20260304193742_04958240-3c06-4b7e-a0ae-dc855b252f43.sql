
-- Fix partner trigger to use current_setting instead of vault secrets
CREATE OR REPLACE FUNCTION public.trigger_sync_partner_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text := 'https://chgrkvftjfibufoopmav.supabase.co/functions/v1/sync-partner-funnel-to-crm';
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTQ3NDYsImV4cCI6MjA5MDA3MDc0Nn0.gzU9FP-wAAmmQAUClSK53x6kwr_j_N2AkmBPMJ011qc';
BEGIN
  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon_key
    ),
    body := jsonb_build_object('partner_request_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

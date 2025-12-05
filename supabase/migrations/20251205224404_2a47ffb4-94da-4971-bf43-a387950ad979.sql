-- Phase 2: Enhance error_logs table for resolution workflow

-- Add resolution workflow columns
ALTER TABLE public.error_logs
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
ADD COLUMN IF NOT EXISTS error_type VARCHAR(50) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(100),
ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

-- Create index for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON public.error_logs(fingerprint);

-- Create index for unresolved errors
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON public.error_logs(resolved) WHERE resolved = false;

-- Create index for severity filtering
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);

-- Create index for error_type filtering
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);

-- Create function to update occurrence count on duplicate fingerprint
CREATE OR REPLACE FUNCTION update_error_occurrence()
RETURNS TRIGGER AS $$
BEGIN
  -- If fingerprint exists and is recent (within 24 hours), update instead of insert
  IF NEW.fingerprint IS NOT NULL THEN
    UPDATE public.error_logs
    SET 
      occurrence_count = occurrence_count + 1,
      last_seen_at = now()
    WHERE fingerprint = NEW.fingerprint
      AND created_at > now() - INTERVAL '24 hours'
      AND id != NEW.id;
    
    -- If we updated an existing row, we could potentially skip the insert
    -- But for now, we'll keep both for detailed logging
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for occurrence updates
DROP TRIGGER IF EXISTS trigger_update_error_occurrence ON public.error_logs;
CREATE TRIGGER trigger_update_error_occurrence
  AFTER INSERT ON public.error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_error_occurrence();

-- Create function to mark error as resolved
CREATE OR REPLACE FUNCTION resolve_error(
  p_error_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.error_logs
  SET 
    resolved = true,
    resolved_by = auth.uid(),
    resolved_at = now(),
    resolution_notes = p_notes
  WHERE id = p_error_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission on resolve function
GRANT EXECUTE ON FUNCTION resolve_error(UUID, TEXT) TO authenticated;

-- Create view for error analytics
CREATE OR REPLACE VIEW error_analytics_summary AS
SELECT
  date_trunc('day', created_at) as date,
  severity,
  error_type,
  count(*) as error_count,
  count(*) FILTER (WHERE resolved = true) as resolved_count,
  avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE resolved = true) as avg_resolution_hours
FROM public.error_logs
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at), severity, error_type
ORDER BY date DESC;

-- Grant select on view
GRANT SELECT ON error_analytics_summary TO authenticated;
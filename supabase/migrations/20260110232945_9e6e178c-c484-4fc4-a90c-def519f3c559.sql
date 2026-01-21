-- Create system_alerts table for queue health monitoring
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  metadata JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on system_alerts
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view alerts (admin check done in app)
CREATE POLICY "Authenticated users can view alerts" ON public.system_alerts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy for authenticated users to update alerts
CREATE POLICY "Authenticated users can update alerts" ON public.system_alerts
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create queue health check function
CREATE OR REPLACE FUNCTION public.check_queue_health()
RETURNS void AS $$
DECLARE
  queue_depth INTEGER;
  avg_latency NUMERIC;
BEGIN
  SELECT COUNT(*) INTO queue_depth 
  FROM intelligence_queue 
  WHERE status = 'pending';
  
  SELECT AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000)
  INTO avg_latency
  FROM intelligence_queue
  WHERE processed_at IS NOT NULL
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF queue_depth > 100 OR COALESCE(avg_latency, 0) > 2000 THEN
    INSERT INTO system_alerts (alert_type, message, severity, metadata)
    VALUES (
      'queue_health',
      CASE 
        WHEN queue_depth > 200 THEN 'Critical: Intelligence queue depth exceeds 200 items'
        WHEN queue_depth > 100 THEN 'Warning: Intelligence queue depth exceeds 100 items'
        WHEN avg_latency > 2000 THEN 'Warning: Queue processing latency exceeds 2 seconds'
        ELSE 'Queue health warning'
      END,
      CASE WHEN queue_depth > 200 THEN 'critical' ELSE 'warning' END,
      jsonb_build_object(
        'queue_depth', queue_depth, 
        'avg_latency_ms', COALESCE(avg_latency, 0),
        'checked_at', NOW()
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to evict stale embedding cache entries
CREATE OR REPLACE FUNCTION public.evict_stale_embedding_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM embedding_cache 
    WHERE expires_at < NOW() 
      OR (last_hit_at < NOW() - INTERVAL '30 days' AND hit_count < 3)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to expire old predictive signals
CREATE OR REPLACE FUNCTION public.expire_old_predictive_signals()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM predictive_signals 
    WHERE created_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create index for faster queue depth queries
CREATE INDEX IF NOT EXISTS idx_intelligence_queue_status_pending 
  ON intelligence_queue(status) WHERE status = 'pending';

-- Create index for embedding cache expiry queries
CREATE INDEX IF NOT EXISTS idx_embedding_cache_expires 
  ON embedding_cache(expires_at);

-- Create index for predictive signals cleanup
CREATE INDEX IF NOT EXISTS idx_predictive_signals_created 
  ON predictive_signals(created_at);
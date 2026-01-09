-- Phase 2: SLA Monitoring & Structured Logging Infrastructure

-- 1. Create kpi_execution_events table for structured logging
CREATE TABLE IF NOT EXISTS public.kpi_execution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'start', 'success', 'failure', 'circuit_open', 'circuit_close'
  function_name TEXT NOT NULL,
  domain TEXT,
  severity TEXT DEFAULT 'info', -- 'debug', 'info', 'warn', 'error', 'critical'
  message TEXT,
  metadata JSONB DEFAULT '{}',
  duration_ms INTEGER,
  metrics_count INTEGER,
  error_message TEXT,
  trace_id UUID, -- For correlating related events
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create circuit_breaker_state table for circuit breaker pattern
CREATE TABLE IF NOT EXISTS public.circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT UNIQUE NOT NULL,
  state TEXT NOT NULL DEFAULT 'closed', -- 'closed', 'open', 'half_open'
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  failure_threshold INTEGER DEFAULT 5,
  recovery_timeout_seconds INTEGER DEFAULT 60,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create kpi_sla_config table for SLA thresholds
CREATE TABLE IF NOT EXISTS public.kpi_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  max_stale_minutes INTEGER DEFAULT 60, -- Data considered stale after this
  target_calculation_time_ms INTEGER DEFAULT 5000, -- Target time for calculations
  min_success_rate NUMERIC(5,2) DEFAULT 99.00, -- Minimum success rate %
  alert_on_breach BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(domain)
);

-- Insert default SLA configs
INSERT INTO public.kpi_sla_config (domain, max_stale_minutes, target_calculation_time_ms, min_success_rate)
VALUES 
  ('operations', 60, 10000, 99.0),
  ('sales', 30, 8000, 99.5),
  ('website', 15, 5000, 99.0),
  ('financial', 120, 15000, 99.0),
  ('platform', 60, 5000, 99.9),
  ('intelligence', 60, 30000, 95.0),
  ('growth', 60, 10000, 99.0)
ON CONFLICT (domain) DO NOTHING;

-- 4. Create function to check SLA status
CREATE OR REPLACE FUNCTION public.get_kpi_sla_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'domains', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'domain', sla.domain,
          'max_stale_minutes', sla.max_stale_minutes,
          'target_calculation_time_ms', sla.target_calculation_time_ms,
          'min_success_rate', sla.min_success_rate,
          'last_calculation', (
            SELECT MAX(created_at) 
            FROM kpi_execution_events 
            WHERE domain = sla.domain AND event_type = 'success'
          ),
          'is_stale', (
            SELECT COALESCE(
              EXTRACT(EPOCH FROM (now() - MAX(created_at))) / 60 > sla.max_stale_minutes,
              true
            )
            FROM kpi_execution_events 
            WHERE domain = sla.domain AND event_type = 'success'
          ),
          'recent_success_rate', (
            SELECT ROUND(
              COUNT(*) FILTER (WHERE event_type = 'success')::NUMERIC / 
              NULLIF(COUNT(*), 0) * 100,
              2
            )
            FROM kpi_execution_events 
            WHERE domain = sla.domain 
              AND created_at > now() - interval '24 hours'
              AND event_type IN ('success', 'failure')
          ),
          'avg_calculation_time_ms', (
            SELECT ROUND(AVG(duration_ms))
            FROM kpi_execution_events 
            WHERE domain = sla.domain 
              AND event_type = 'success'
              AND created_at > now() - interval '24 hours'
          ),
          'sla_status', CASE
            WHEN (
              SELECT COALESCE(
                EXTRACT(EPOCH FROM (now() - MAX(created_at))) / 60 > sla.max_stale_minutes,
                true
              )
              FROM kpi_execution_events 
              WHERE domain = sla.domain AND event_type = 'success'
            ) THEN 'breach'
            WHEN (
              SELECT COALESCE(
                COUNT(*) FILTER (WHERE event_type = 'success')::NUMERIC / 
                NULLIF(COUNT(*), 0) * 100 < sla.min_success_rate,
                false
              )
              FROM kpi_execution_events 
              WHERE domain = sla.domain 
                AND created_at > now() - interval '24 hours'
                AND event_type IN ('success', 'failure')
            ) THEN 'warning'
            ELSE 'healthy'
          END
        )
      )
      FROM kpi_sla_config sla
    ),
    'circuit_breakers', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'function_name', cb.function_name,
          'state', cb.state,
          'failure_count', cb.failure_count,
          'last_failure_at', cb.last_failure_at,
          'next_retry_at', cb.next_retry_at
        )
      )
      FROM circuit_breaker_state cb
      WHERE cb.state != 'closed'
    ),
    'overall_health', (
      SELECT CASE
        WHEN EXISTS (
          SELECT 1 FROM circuit_breaker_state WHERE state = 'open'
        ) THEN 'critical'
        WHEN EXISTS (
          SELECT 1 FROM kpi_sla_config sla
          WHERE (
            SELECT COALESCE(
              EXTRACT(EPOCH FROM (now() - MAX(created_at))) / 60 > sla.max_stale_minutes,
              true
            )
            FROM kpi_execution_events 
            WHERE domain = sla.domain AND event_type = 'success'
          )
        ) THEN 'degraded'
        ELSE 'healthy'
      END
    ),
    'last_updated', now()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 5. Create function to log KPI execution events
CREATE OR REPLACE FUNCTION public.log_kpi_execution_event(
  p_event_type TEXT,
  p_function_name TEXT,
  p_domain TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_duration_ms INTEGER DEFAULT NULL,
  p_metrics_count INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_trace_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO kpi_execution_events (
    event_type, function_name, domain, severity, message, 
    metadata, duration_ms, metrics_count, error_message, trace_id
  ) VALUES (
    p_event_type, p_function_name, p_domain, p_severity, p_message,
    p_metadata, p_duration_ms, p_metrics_count, p_error_message, 
    COALESCE(p_trace_id, gen_random_uuid())
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- 6. Create function to update circuit breaker state
CREATE OR REPLACE FUNCTION public.update_circuit_breaker(
  p_function_name TEXT,
  p_success BOOLEAN
)
RETURNS TEXT -- Returns new state
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_state RECORD;
  new_state TEXT;
BEGIN
  -- Get or create circuit breaker record
  INSERT INTO circuit_breaker_state (function_name, state)
  VALUES (p_function_name, 'closed')
  ON CONFLICT (function_name) DO NOTHING;
  
  SELECT * INTO current_state 
  FROM circuit_breaker_state 
  WHERE function_name = p_function_name;
  
  IF p_success THEN
    -- Success handling
    IF current_state.state = 'half_open' THEN
      -- Successful call in half-open state closes the circuit
      UPDATE circuit_breaker_state SET
        state = 'closed',
        failure_count = 0,
        success_count = success_count + 1,
        last_success_at = now(),
        opened_at = NULL,
        next_retry_at = NULL,
        updated_at = now()
      WHERE function_name = p_function_name;
      new_state := 'closed';
    ELSE
      -- Normal success
      UPDATE circuit_breaker_state SET
        success_count = success_count + 1,
        last_success_at = now(),
        updated_at = now()
      WHERE function_name = p_function_name;
      new_state := current_state.state;
    END IF;
  ELSE
    -- Failure handling
    IF current_state.state = 'open' THEN
      -- Check if we should try half-open
      IF current_state.next_retry_at <= now() THEN
        UPDATE circuit_breaker_state SET
          state = 'half_open',
          updated_at = now()
        WHERE function_name = p_function_name;
        new_state := 'half_open';
      ELSE
        new_state := 'open';
      END IF;
    ELSIF current_state.state = 'half_open' THEN
      -- Failed in half-open, back to open
      UPDATE circuit_breaker_state SET
        state = 'open',
        failure_count = failure_count + 1,
        last_failure_at = now(),
        opened_at = now(),
        next_retry_at = now() + (recovery_timeout_seconds || ' seconds')::interval,
        updated_at = now()
      WHERE function_name = p_function_name;
      new_state := 'open';
    ELSE
      -- Closed state, increment failure
      UPDATE circuit_breaker_state SET
        failure_count = failure_count + 1,
        last_failure_at = now(),
        updated_at = now()
      WHERE function_name = p_function_name;
      
      -- Check if we should open
      IF current_state.failure_count + 1 >= current_state.failure_threshold THEN
        UPDATE circuit_breaker_state SET
          state = 'open',
          opened_at = now(),
          next_retry_at = now() + (recovery_timeout_seconds || ' seconds')::interval
        WHERE function_name = p_function_name;
        new_state := 'open';
      ELSE
        new_state := 'closed';
      END IF;
    END IF;
  END IF;
  
  RETURN new_state;
END;
$$;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kpi_execution_events_domain_created 
ON kpi_execution_events(domain, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_execution_events_trace 
ON kpi_execution_events(trace_id);

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state_function 
ON circuit_breaker_state(function_name);

-- 8. Enable RLS
ALTER TABLE kpi_execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_sla_config ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies (admin read access)
CREATE POLICY "Admins can view execution events" ON kpi_execution_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can view circuit breaker state" ON circuit_breaker_state
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can view SLA config" ON kpi_sla_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Service role can insert events
CREATE POLICY "Service role can insert events" ON kpi_execution_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can manage circuit breakers" ON circuit_breaker_state
  FOR ALL
  USING (true)
  WITH CHECK (true);
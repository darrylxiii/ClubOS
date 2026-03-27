-- ============================================================================
-- INTELLIGENCE BUS: Foundation Tables
-- ============================================================================
-- Replaces tables dropped by 20260328100000_drop_ghost_feature_tables.sql
-- (ai_action_log, workflow_executions, webhook_deliveries, webhook_endpoints)
-- and creates new infrastructure for the unified Intelligence Bus.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. intelligence_action_log (replaces dropped ai_action_log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.intelligence_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL DEFAULT 'system',
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying')),
  result JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  idempotency_key TEXT,
  correlation_id UUID,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(idempotency_key)
);

CREATE INDEX idx_intel_action_log_user ON intelligence_action_log(user_id, created_at DESC);
CREATE INDEX idx_intel_action_log_correlation ON intelligence_action_log(correlation_id);
CREATE INDEX idx_intel_action_log_status ON intelligence_action_log(status) WHERE status IN ('pending', 'running', 'retrying');
CREATE INDEX idx_intel_action_log_agent ON intelligence_action_log(agent_name, created_at DESC);

ALTER TABLE intelligence_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own actions" ON intelligence_action_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on intel_action_log" ON intelligence_action_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. communication_workflows (never existed, referenced by orchestrate-communication-workflow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.communication_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  target_entity_types TEXT[] DEFAULT '{}',
  actions JSONB[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  cooldown_hours INTEGER DEFAULT 24,
  max_executions_per_entity INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comm_workflows_trigger ON communication_workflows(trigger_type, is_active);

ALTER TABLE communication_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage workflows" ON communication_workflows
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role full access on comm_workflows" ON communication_workflows
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. workflow_executions (dropped, re-created with better schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES communication_workflows(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  trigger_event JSONB,
  actions_executed JSONB[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  correlation_id UUID,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_workflow_exec_status ON workflow_executions(status, started_at DESC);
CREATE INDEX idx_workflow_exec_entity ON workflow_executions(entity_type, entity_id);
CREATE INDEX idx_workflow_exec_workflow ON workflow_executions(workflow_id);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view workflow executions" ON workflow_executions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role full access on workflow_exec" ON workflow_executions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. dead_letter_queue
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  original_payload JSONB NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'exhausted', 'resolved')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dlq_status ON dead_letter_queue(status, next_retry_at) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_dlq_source ON dead_letter_queue(source_table, source_id);

ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage DLQ" ON dead_letter_queue
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role full access on dlq" ON dead_letter_queue
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. event_deduplication
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_deduplication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_fingerprint TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  entity_id UUID,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  occurrence_count INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX idx_event_dedup_expiry ON event_deduplication(expires_at);

-- No RLS needed: only accessed by service role via edge functions

-- ============================================================================
-- 6. agent_health
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'failing', 'offline')),
  last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  success_rate_1h FLOAT DEFAULT 1.0,
  avg_duration_ms_1h FLOAT DEFAULT 0,
  total_invocations_1h INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agent_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view agent health" ON agent_health
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role full access on agent_health" ON agent_health
  FOR ALL USING (auth.role() = 'service_role');

-- Seed agent health records for registered agents
INSERT INTO agent_health (agent_name) VALUES
  ('club_ai'), ('sourcing_agent'), ('engagement_agent'),
  ('interview_agent'), ('analytics_agent'), ('partner_agent'),
  ('intelligence_bus'), ('learning_system')
ON CONFLICT (agent_name) DO NOTHING;

-- ============================================================================
-- 7. agent_signals (cross-agent communication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent TEXT NOT NULL,
  to_agent TEXT,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('request_action', 'share_context', 'escalate', 'complete_handoff')),
  payload JSONB NOT NULL DEFAULT '{}',
  correlation_id UUID,
  priority INTEGER DEFAULT 5,
  consumed BOOLEAN DEFAULT false,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_signals_pending ON agent_signals(to_agent, consumed, priority DESC) WHERE consumed = false;
CREATE INDEX idx_agent_signals_correlation ON agent_signals(correlation_id);
CREATE INDEX idx_agent_signals_expiry ON agent_signals(expires_at) WHERE consumed = false;

-- No RLS needed: only accessed by service role via edge functions

-- ============================================================================
-- 8. intelligence_outcomes (learning loop)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.intelligence_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_log_id UUID REFERENCES intelligence_action_log(id) ON DELETE SET NULL,
  correlation_id UUID,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('positive', 'negative', 'neutral', 'user_override')),
  outcome_data JSONB DEFAULT '{}',
  user_feedback TEXT,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  was_autonomous BOOLEAN DEFAULT false,
  agent_name TEXT,
  action_type TEXT,
  context_snapshot JSONB,
  time_to_outcome_ms BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_outcomes_agent ON intelligence_outcomes(agent_name, outcome_type);
CREATE INDEX idx_outcomes_correlation ON intelligence_outcomes(correlation_id);
CREATE INDEX idx_outcomes_created ON intelligence_outcomes(created_at DESC);

ALTER TABLE intelligence_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view outcomes" ON intelligence_outcomes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role full access on outcomes" ON intelligence_outcomes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 9. Add batch processing columns to existing tables
-- ============================================================================

-- agent_events: locking + retry support
ALTER TABLE public.agent_events
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correlation_id UUID;

CREATE INDEX IF NOT EXISTS idx_agent_events_batch
  ON agent_events(processed, priority DESC, created_at ASC)
  WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_agent_events_lock
  ON agent_events(locked_by, locked_at)
  WHERE locked_by IS NOT NULL;

-- intelligence_queue: locking support
ALTER TABLE public.intelligence_queue
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correlation_id UUID;

-- communication_task_queue: locking support
ALTER TABLE public.communication_task_queue
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correlation_id UUID;

-- ============================================================================
-- 10. RPC: Atomic event locking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.lock_agent_events(
  p_lock_id TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_count INTEGER;
BEGIN
  -- Release stale locks (>5 minutes old)
  UPDATE agent_events
  SET locked_by = NULL, locked_at = NULL
  WHERE locked_by IS NOT NULL
    AND locked_at < now() - INTERVAL '5 minutes'
    AND processed = false;

  -- Lock a batch atomically
  WITH to_lock AS (
    SELECT id FROM agent_events
    WHERE processed = false
      AND (locked_by IS NULL OR locked_at < now() - INTERVAL '5 minutes')
    ORDER BY priority DESC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE agent_events
  SET locked_by = p_lock_id, locked_at = now()
  FROM to_lock
  WHERE agent_events.id = to_lock.id;

  GET DIAGNOSTICS locked_count = ROW_COUNT;
  RETURN locked_count;
END;
$$;

-- ============================================================================
-- 11. RPC: Increment agent failures atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_agent_failures(p_agent_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agent_health
  SET consecutive_failures = consecutive_failures + 1,
      status = CASE
        WHEN consecutive_failures + 1 >= 10 THEN 'offline'
        WHEN consecutive_failures + 1 >= 5 THEN 'failing'
        WHEN consecutive_failures + 1 >= 3 THEN 'degraded'
        ELSE status
      END,
      updated_at = now()
  WHERE agent_name = p_agent_name;
END;
$$;

-- ============================================================================
-- 12. RPCs: Learning loop outcome tracking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_positive_outcomes(
  p_agent_name TEXT,
  p_action_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agent_behavior_rules
  SET positive_outcomes = COALESCE(positive_outcomes, 0) + 1,
      confidence_score = LEAST(1.0, COALESCE(confidence_score, 0.5) + 0.02),
      last_validated_at = now(),
      updated_at = now()
  WHERE agent_name = p_agent_name
    AND rule_type = p_action_type
    AND is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_negative_outcomes(
  p_agent_name TEXT,
  p_action_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agent_behavior_rules
  SET negative_outcomes = COALESCE(negative_outcomes, 0) + 1,
      confidence_score = GREATEST(0.0, COALESCE(confidence_score, 0.5) - 0.05),
      last_validated_at = now(),
      updated_at = now()
  WHERE agent_name = p_agent_name
    AND rule_type = p_action_type
    AND is_active = true;

  -- Auto-disable rules that consistently fail (2:1 negative:positive, 10+ samples)
  UPDATE agent_behavior_rules
  SET is_active = false, updated_at = now()
  WHERE agent_name = p_agent_name
    AND rule_type = p_action_type
    AND COALESCE(negative_outcomes, 0) > COALESCE(positive_outcomes, 0) * 2
    AND COALESCE(negative_outcomes, 0) >= 10;
END;
$$;

-- ============================================================================
-- 13. Seed default communication workflows
-- ============================================================================
INSERT INTO communication_workflows (name, trigger_type, trigger_conditions, target_entity_types, actions, priority, cooldown_hours) VALUES
  (
    'Re-engage Cold Relationships',
    'pattern_detected',
    '{"pattern_type": "going_cold", "confidence_threshold": 0.7}'::jsonb,
    '{candidate,prospect}',
    ARRAY[
      '{"type": "create_task", "config": {"title": "Re-engage cold relationship", "priority": "high", "due_days": 1}}'::jsonb,
      '{"type": "send_notification", "config": {"title": "Relationship Alert", "message": "Relationship going cold", "type": "warning"}}'::jsonb
    ],
    8, 72
  ),
  (
    'Capitalize on High Engagement',
    'pattern_detected',
    '{"pattern_type": "highly_engaged"}'::jsonb,
    '{candidate,prospect}',
    ARRAY[
      '{"type": "create_task", "config": {"title": "Advance engaged relationship", "priority": "medium", "due_days": 2}}'::jsonb
    ],
    5, 48
  ),
  (
    'Convert Hot Lead',
    'pattern_detected',
    '{"pattern_type": "ready_to_convert", "confidence_threshold": 0.8}'::jsonb,
    '{candidate,prospect}',
    ARRAY[
      '{"type": "create_task", "config": {"title": "Close opportunity", "priority": "urgent", "due_days": 0}}'::jsonb,
      '{"type": "send_notification", "config": {"title": "Hot Lead Alert", "message": "Ready for conversion!", "type": "success"}}'::jsonb
    ],
    9, 168
  ),
  (
    'Escalate Unresponsive',
    'pattern_detected',
    '{"pattern_type": "needs_escalation"}'::jsonb,
    '{candidate,prospect}',
    ARRAY[
      '{"type": "assign_strategist", "config": {"reason": "Multiple unanswered attempts", "escalation_level": "senior"}}'::jsonb,
      '{"type": "create_task", "config": {"title": "Escalated: Review approach", "priority": "high", "due_days": 1}}'::jsonb
    ],
    7, 120
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14. pg_cron: Deduplication cleanup (hourly)
-- ============================================================================
SELECT cron.schedule(
  'cleanup-event-deduplication',
  '0 * * * *',
  $$DELETE FROM public.event_deduplication WHERE expires_at < now()$$
);

-- ============================================================================
-- 15. pg_cron: DLQ retry (every 15 minutes)
-- ============================================================================
SELECT cron.schedule(
  'retry-dead-letter-queue',
  '*/15 * * * *',
  $$UPDATE public.dead_letter_queue SET status = 'retrying', updated_at = now() WHERE status = 'pending' AND next_retry_at <= now() AND retry_count < max_retries$$
);

-- ============================================================================
-- 16. pg_cron: Expired agent signals cleanup (every 30 minutes)
-- ============================================================================
SELECT cron.schedule(
  'cleanup-expired-agent-signals',
  '*/30 * * * *',
  $$DELETE FROM public.agent_signals WHERE expires_at < now() AND consumed = false$$
);

-- ============================================================================
-- 17. pg_cron + pg_net: Near-real-time event processing (every minute)
-- Only fires when there are pending events to process.
-- ============================================================================
SELECT cron.schedule(
  'process-agent-events',
  '* * * * *',
  $$
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM public.agent_events WHERE processed = false LIMIT 1) THEN
      PERFORM net.http_post(
        url := current_setting('app.settings.service_url', true) || '/functions/v1/intelligence-bus',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{"operation":"process_event_batch","config":{"batch_size":50}}'::jsonb
      );
    END IF;
  END
  $$;
  $$
);

-- ============================================================================
-- 18. pg_cron + pg_net: Intelligence queue processing (every 5 minutes)
-- ============================================================================
SELECT cron.schedule(
  'process-intelligence-queue',
  '*/5 * * * *',
  $$
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM public.intelligence_queue WHERE status = 'pending' LIMIT 1) THEN
      PERFORM net.http_post(
        url := current_setting('app.settings.service_url', true) || '/functions/v1/intelligence-bus',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{"operation":"process_queue","config":{"queue":"intelligence_queue","batch_size":25}}'::jsonb
      );
    END IF;
  END
  $$;
  $$
);

-- ============================================================================
-- 19. pg_cron + pg_net: Communication task queue processing (every 5 minutes)
-- ============================================================================
SELECT cron.schedule(
  'process-communication-tasks',
  '*/5 * * * *',
  $$
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM public.communication_task_queue WHERE processing_status = 'pending' LIMIT 1) THEN
      PERFORM net.http_post(
        url := current_setting('app.settings.service_url', true) || '/functions/v1/intelligence-bus',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{"operation":"process_queue","config":{"queue":"communication_task_queue","batch_size":20}}'::jsonb
      );
    END IF;
  END
  $$;
  $$
);

-- ============================================================================
-- 20. pg_cron + pg_net: Full cycle safety net (every 6 hours)
-- ============================================================================
SELECT cron.schedule(
  'intelligence-bus-full-cycle',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.service_url', true) || '/functions/v1/intelligence-bus',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{"operation":"full_cycle","config":{"batch_size":200}}'::jsonb
  );
  $$
);

COMMIT;

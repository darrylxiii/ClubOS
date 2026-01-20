-- Predictive Signals & AI Action Audit Tables (Fixed RLS)

-- 1. Create predictive_signals table
CREATE TABLE IF NOT EXISTS predictive_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  signal_strength NUMERIC DEFAULT 0.5,
  evidence JSONB DEFAULT '{}',
  recommended_actions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES auth.users(id),
  detected_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(signal_type, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_predictive_signals_active ON predictive_signals(is_active, signal_strength DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_predictive_signals_entity ON predictive_signals(entity_type, entity_id);

-- 2. Create ai_action_audit table
CREATE TABLE IF NOT EXISTS ai_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'ai',
  actor_id TEXT,
  target_entity_type TEXT,
  target_entity_id UUID,
  action_details JSONB DEFAULT '{}',
  context_used JSONB DEFAULT '{}',
  outcome TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_audit_created ON ai_action_audit(created_at DESC);

-- 3. Enable RLS
ALTER TABLE predictive_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_audit ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies using has_role function
CREATE POLICY "Admins can manage predictive_signals"
  ON predictive_signals FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Strategists can view predictive_signals"
  ON predictive_signals FOR SELECT
  USING (has_role(auth.uid(), 'strategist'));

CREATE POLICY "Admins can view ai_action_audit"
  ON ai_action_audit FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Service can insert ai_action_audit"
  ON ai_action_audit FOR INSERT WITH CHECK (true);

-- 5. Grants
GRANT SELECT ON predictive_signals TO authenticated;
GRANT SELECT, INSERT ON ai_action_audit TO authenticated;
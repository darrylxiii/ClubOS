-- Phase 4: Smart Conflict Resolution Engine

-- Scheduling conflicts tracking
CREATE TABLE scheduling_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('double_booking', 'overlap', 'travel_time', 'timezone_issue', 'buffer_violation')),
  involved_bookings UUID[] DEFAULT '{}',
  involved_calendar_events JSONB DEFAULT '[]',
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'error', 'critical')),
  proposed_solutions JSONB DEFAULT '[]',
  selected_solution_index INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored', 'escalated')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conflict resolution history for audit
CREATE TABLE conflict_resolution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID REFERENCES scheduling_conflicts(id) ON DELETE CASCADE NOT NULL,
  action_taken TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  affected_parties TEXT[] DEFAULT '{}',
  notifications_sent BOOLEAN DEFAULT false,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_conflicts_user ON scheduling_conflicts(user_id);
CREATE INDEX idx_conflicts_status ON scheduling_conflicts(status);
CREATE INDEX idx_conflicts_created ON scheduling_conflicts(created_at DESC);
CREATE INDEX idx_resolution_conflict ON conflict_resolution_history(conflict_id);

-- Enable RLS
ALTER TABLE scheduling_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_resolution_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduling_conflicts
CREATE POLICY "Users can view their own conflicts"
  ON scheduling_conflicts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conflicts"
  ON scheduling_conflicts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conflicts"
  ON scheduling_conflicts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conflicts"
  ON scheduling_conflicts FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all conflicts
CREATE POLICY "Admins can manage all conflicts"
  ON scheduling_conflicts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- RLS policies for conflict_resolution_history
CREATE POLICY "Users can view resolution history for their conflicts"
  ON conflict_resolution_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduling_conflicts
      WHERE scheduling_conflicts.id = conflict_resolution_history.conflict_id
      AND scheduling_conflicts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create resolution history for their conflicts"
  ON conflict_resolution_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scheduling_conflicts
      WHERE scheduling_conflicts.id = conflict_resolution_history.conflict_id
      AND scheduling_conflicts.user_id = auth.uid()
    )
  );

-- Admins can manage all resolution history
CREATE POLICY "Admins can manage all resolution history"
  ON conflict_resolution_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_scheduling_conflicts_updated_at
  BEFORE UPDATE ON scheduling_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
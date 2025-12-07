
-- Timesheet periods table for weekly/bi-weekly timesheet tracking
CREATE TABLE public.timesheet_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_hours NUMERIC(10,2) DEFAULT 0,
  billable_hours NUMERIC(10,2) DEFAULT 0,
  non_billable_hours NUMERIC(10,2) DEFAULT 0,
  overtime_hours NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'recalled')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  approver_id UUID REFERENCES auth.users(id),
  approver_comment TEXT,
  user_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, start_date, end_date)
);

-- Add timesheet link and lock to time_entries
ALTER TABLE public.time_entries 
  ADD COLUMN IF NOT EXISTS timesheet_period_id UUID REFERENCES public.timesheet_periods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Approval workflows configuration per company
CREATE TABLE public.approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workflow_type TEXT DEFAULT 'single' CHECK (workflow_type IN ('single', 'sequential', 'parallel')),
  steps JSONB NOT NULL DEFAULT '[]',
  auto_approve_after_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Timesheet approvals for multi-step workflows
CREATE TABLE public.timesheet_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES public.timesheet_periods(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id),
  step_number INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delegated')),
  comment TEXT,
  decided_at TIMESTAMPTZ,
  delegated_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Time entry audit log for compliance
CREATE TABLE public.time_entry_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  timesheet_id UUID REFERENCES public.timesheet_periods(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'lock', 'unlock', 'submit', 'approve', 'reject', 'recall')),
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timesheet_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entry_audit_logs ENABLE ROW LEVEL SECURITY;

-- Timesheet periods policies
CREATE POLICY "Users can view own timesheets" ON public.timesheet_periods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view team timesheets" ON public.timesheet_periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'strategist', 'partner')
    )
  );

CREATE POLICY "Users can create own timesheets" ON public.timesheet_periods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft timesheets" ON public.timesheet_periods
  FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Managers can update timesheets for approval" ON public.timesheet_periods
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'strategist', 'partner')
    )
  );

-- Approval workflows policies
CREATE POLICY "Company members can view workflows" ON public.approval_workflows
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage workflows" ON public.approval_workflows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Timesheet approvals policies
CREATE POLICY "Users can view approvals for own timesheets" ON public.timesheet_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.timesheet_periods tp 
      WHERE tp.id = timesheet_id 
      AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Approvers can view and manage approvals" ON public.timesheet_approvals
  FOR ALL USING (
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'strategist', 'partner')
    )
  );

-- Audit log policies
CREATE POLICY "Users can view own audit logs" ON public.time_entry_audit_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs" ON public.time_entry_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs" ON public.time_entry_audit_logs
  FOR INSERT WITH CHECK (true);

-- Function to generate weekly timesheet
CREATE OR REPLACE FUNCTION public.generate_weekly_timesheet(
  p_user_id UUID,
  p_week_start DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_timesheet_id UUID;
  v_total_hours NUMERIC(10,2);
  v_billable_hours NUMERIC(10,2);
BEGIN
  -- Default to current week (Monday start)
  v_start_date := COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::DATE);
  v_end_date := v_start_date + INTERVAL '6 days';
  
  -- Check if timesheet already exists
  SELECT id INTO v_timesheet_id
  FROM timesheet_periods
  WHERE user_id = p_user_id
    AND start_date = v_start_date
    AND end_date = v_end_date;
  
  IF v_timesheet_id IS NOT NULL THEN
    RETURN v_timesheet_id;
  END IF;
  
  -- Calculate hours from time entries
  SELECT 
    COALESCE(SUM(duration_seconds) / 3600.0, 0),
    COALESCE(SUM(CASE WHEN is_billable THEN duration_seconds ELSE 0 END) / 3600.0, 0)
  INTO v_total_hours, v_billable_hours
  FROM time_entries
  WHERE user_id = p_user_id
    AND DATE(start_time) BETWEEN v_start_date AND v_end_date
    AND end_time IS NOT NULL;
  
  -- Create new timesheet
  INSERT INTO timesheet_periods (
    user_id, start_date, end_date, 
    total_hours, billable_hours, non_billable_hours,
    overtime_hours
  )
  VALUES (
    p_user_id, v_start_date, v_end_date,
    v_total_hours, v_billable_hours, v_total_hours - v_billable_hours,
    GREATEST(v_total_hours - 40, 0)
  )
  RETURNING id INTO v_timesheet_id;
  
  -- Link time entries to this timesheet
  UPDATE time_entries
  SET timesheet_period_id = v_timesheet_id
  WHERE user_id = p_user_id
    AND DATE(start_time) BETWEEN v_start_date AND v_end_date
    AND timesheet_period_id IS NULL;
  
  RETURN v_timesheet_id;
END;
$$;

-- Function to submit timesheet
CREATE OR REPLACE FUNCTION public.submit_timesheet(
  p_timesheet_id UUID,
  p_user_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_user_id
  FROM timesheet_periods
  WHERE id = p_timesheet_id AND status = 'draft';
  
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  -- Update timesheet status
  UPDATE timesheet_periods
  SET status = 'submitted',
      submitted_at = now(),
      user_notes = COALESCE(p_user_notes, user_notes),
      updated_at = now()
  WHERE id = p_timesheet_id;
  
  -- Lock all related time entries
  UPDATE time_entries
  SET is_locked = true
  WHERE timesheet_period_id = p_timesheet_id;
  
  -- Log the action
  INSERT INTO time_entry_audit_logs (timesheet_id, user_id, action, changes)
  VALUES (p_timesheet_id, auth.uid(), 'submit', jsonb_build_object('status', 'submitted'));
  
  RETURN TRUE;
END;
$$;

-- Function to recall timesheet
CREATE OR REPLACE FUNCTION public.recall_timesheet(p_timesheet_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
BEGIN
  -- Verify ownership and status
  SELECT user_id, status INTO v_user_id, v_status
  FROM timesheet_periods
  WHERE id = p_timesheet_id;
  
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  IF v_status NOT IN ('submitted') THEN
    RETURN FALSE; -- Can only recall submitted, not approved
  END IF;
  
  -- Update timesheet status
  UPDATE timesheet_periods
  SET status = 'recalled',
      updated_at = now()
  WHERE id = p_timesheet_id;
  
  -- Unlock time entries
  UPDATE time_entries
  SET is_locked = false
  WHERE timesheet_period_id = p_timesheet_id;
  
  -- Log the action
  INSERT INTO time_entry_audit_logs (timesheet_id, user_id, action, changes)
  VALUES (p_timesheet_id, auth.uid(), 'recall', jsonb_build_object('status', 'recalled'));
  
  RETURN TRUE;
END;
$$;

-- Function to approve/reject timesheet
CREATE OR REPLACE FUNCTION public.process_timesheet_approval(
  p_timesheet_id UUID,
  p_action TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify approver has permission
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist', 'partner')
  ) THEN
    RETURN FALSE;
  END IF;
  
  IF p_action = 'approve' THEN
    UPDATE timesheet_periods
    SET status = 'approved',
        approved_at = now(),
        approver_id = auth.uid(),
        approver_comment = p_comment,
        updated_at = now()
    WHERE id = p_timesheet_id AND status = 'submitted';
    
    -- Log approval
    INSERT INTO time_entry_audit_logs (timesheet_id, user_id, action, changes)
    VALUES (p_timesheet_id, auth.uid(), 'approve', jsonb_build_object('comment', p_comment));
    
  ELSIF p_action = 'reject' THEN
    UPDATE timesheet_periods
    SET status = 'rejected',
        rejected_at = now(),
        approver_id = auth.uid(),
        approver_comment = p_comment,
        updated_at = now()
    WHERE id = p_timesheet_id AND status = 'submitted';
    
    -- Unlock entries on rejection so user can edit
    UPDATE time_entries
    SET is_locked = false
    WHERE timesheet_period_id = p_timesheet_id;
    
    -- Log rejection
    INSERT INTO time_entry_audit_logs (timesheet_id, user_id, action, changes)
    VALUES (p_timesheet_id, auth.uid(), 'reject', jsonb_build_object('comment', p_comment));
  ELSE
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timesheet_periods_user_id ON public.timesheet_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_periods_status ON public.timesheet_periods(status);
CREATE INDEX IF NOT EXISTS idx_timesheet_periods_dates ON public.timesheet_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_timesheet_period_id ON public.time_entries(timesheet_period_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_approvals_timesheet_id ON public.timesheet_approvals(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_time_entry_audit_logs_timesheet_id ON public.time_entry_audit_logs(timesheet_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_weekly_timesheet TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_timesheet TO authenticated;
GRANT EXECUTE ON FUNCTION public.recall_timesheet TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_timesheet_approval TO authenticated;

-- CRM Activities System - The Core of Sales CRM
-- Phase 1: Activities table and supporting infrastructure

-- Create activity type enum
DO $$ BEGIN
  CREATE TYPE crm_activity_type AS ENUM (
    'call', 'email', 'meeting', 'task', 'deadline', 'follow_up', 'linkedin', 'note', 'sms'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create activity outcome enum
DO $$ BEGIN
  CREATE TYPE crm_activity_outcome AS ENUM (
    'completed', 'no_answer', 'left_voicemail', 'busy', 'wrong_number', 
    'interested', 'not_interested', 'callback_requested', 'meeting_scheduled',
    'email_sent', 'bounced', 'cancelled', 'rescheduled', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create activities table
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Associations
  prospect_id UUID REFERENCES crm_prospects(id) ON DELETE CASCADE,
  deal_id UUID NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES crm_campaigns(id) ON DELETE SET NULL,
  
  -- Activity details
  activity_type crm_activity_type NOT NULL DEFAULT 'task',
  subject TEXT NOT NULL,
  description TEXT,
  note TEXT,
  
  -- Scheduling
  due_date DATE,
  due_time TIME,
  duration_minutes INTEGER DEFAULT 30,
  all_day BOOLEAN DEFAULT false,
  
  -- Status
  is_done BOOLEAN DEFAULT false,
  done_at TIMESTAMPTZ,
  outcome crm_activity_outcome,
  outcome_notes TEXT,
  
  -- Assignment
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Reminders
  reminder_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  
  -- Integrations
  linked_booking_id UUID NULL,
  linked_meeting_id UUID NULL,
  external_id TEXT,
  
  -- Metadata
  priority INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_activities_prospect ON crm_activities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_owner ON crm_activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_due_date ON crm_activities(due_date) WHERE is_done = false;
CREATE INDEX IF NOT EXISTS idx_crm_activities_done ON crm_activities(is_done);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_created_at ON crm_activities(created_at DESC);

-- Enable RLS
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies using user_roles table
CREATE POLICY "Users can view activities they own or are assigned to"
  ON crm_activities FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Users can create activities"
  ON crm_activities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own activities"
  ON crm_activities FOR UPDATE
  USING (
    owner_id = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Users can delete their own activities"
  ON crm_activities FOR DELETE
  USING (
    owner_id = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add rotting/last activity tracking to prospects
ALTER TABLE crm_prospects 
  ADD COLUMN IF NOT EXISTS next_activity_id UUID,
  ADD COLUMN IF NOT EXISTS next_activity_at TIMESTAMPTZ;

-- Add won/lost reasons to prospects
ALTER TABLE crm_prospects
  ADD COLUMN IF NOT EXISTS closed_reason TEXT,
  ADD COLUMN IF NOT EXISTS closed_reason_category TEXT,
  ADD COLUMN IF NOT EXISTS competitor_name TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID;

-- Function to update prospect's next activity
CREATE OR REPLACE FUNCTION update_prospect_next_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE crm_prospects
  SET 
    next_activity_id = (
      SELECT id FROM crm_activities 
      WHERE prospect_id = COALESCE(NEW.prospect_id, OLD.prospect_id)
        AND is_done = false 
        AND due_date IS NOT NULL
      ORDER BY due_date ASC, due_time ASC NULLS LAST
      LIMIT 1
    ),
    next_activity_at = (
      SELECT 
        CASE 
          WHEN due_time IS NOT NULL THEN (due_date + due_time)::TIMESTAMPTZ
          ELSE due_date::TIMESTAMPTZ
        END
      FROM crm_activities 
      WHERE prospect_id = COALESCE(NEW.prospect_id, OLD.prospect_id)
        AND is_done = false 
        AND due_date IS NOT NULL
      ORDER BY due_date ASC, due_time ASC NULLS LAST
      LIMIT 1
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.prospect_id, OLD.prospect_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update prospect's next activity
DROP TRIGGER IF EXISTS trg_update_prospect_next_activity ON crm_activities;
CREATE TRIGGER trg_update_prospect_next_activity
  AFTER INSERT OR UPDATE OR DELETE ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_next_activity();

-- Function to update last_contacted_at when activity is completed
CREATE OR REPLACE FUNCTION update_prospect_last_contacted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_done = true AND (OLD.is_done = false OR OLD.is_done IS NULL) THEN
    UPDATE crm_prospects
    SET 
      last_contacted_at = now(),
      last_activity_at = now(),
      updated_at = now()
    WHERE id = NEW.prospect_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_prospect_last_contacted ON crm_activities;
CREATE TRIGGER trg_update_prospect_last_contacted
  AFTER UPDATE ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_last_contacted();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_crm_activities_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_activities_updated_at ON crm_activities;
CREATE TRIGGER trg_crm_activities_updated_at
  BEFORE UPDATE ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_activities_updated_at();

-- Enable realtime for activities
ALTER PUBLICATION supabase_realtime ADD TABLE crm_activities;
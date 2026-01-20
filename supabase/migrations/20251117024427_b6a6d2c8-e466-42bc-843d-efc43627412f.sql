-- Create detected_interviews table for storing calendar interviews
CREATE TABLE IF NOT EXISTS detected_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Calendar event reference
  calendar_event_id TEXT NOT NULL,
  calendar_provider TEXT NOT NULL CHECK (calendar_provider IN ('google', 'microsoft')),
  calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
  
  -- Meeting details
  event_title TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  meeting_link TEXT,
  location TEXT,
  event_description TEXT,
  
  -- Detection metadata
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detection_confidence TEXT CHECK (detection_confidence IN ('high', 'medium', 'low')),
  interview_type TEXT CHECK (interview_type IN ('tqc_intro', 'partner_interview', 'panel_interview', 'unknown')),
  
  -- Detected participants (stored as JSONB arrays)
  detected_tqc_members JSONB DEFAULT '[]'::jsonb,
  detected_candidates JSONB DEFAULT '[]'::jsonb,
  detected_partners JSONB DEFAULT '[]'::jsonb,
  unknown_attendees JSONB DEFAULT '[]'::jsonb,
  
  -- Linked data
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  tqc_organizer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed', 'dismissed', 'linked_to_booking')),
  linked_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  manually_edited BOOLEAN DEFAULT false,
  
  -- Notes
  detection_notes TEXT,
  user_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure uniqueness per calendar event
  UNIQUE(calendar_event_id, calendar_provider, calendar_connection_id)
);

-- Add indexes for common queries
CREATE INDEX idx_detected_interviews_job_id ON detected_interviews(job_id);
CREATE INDEX idx_detected_interviews_organizer ON detected_interviews(tqc_organizer_id);
CREATE INDEX idx_detected_interviews_scheduled ON detected_interviews(scheduled_start);
CREATE INDEX idx_detected_interviews_status ON detected_interviews(status);
CREATE INDEX idx_detected_interviews_candidate ON detected_interviews(candidate_id);
CREATE INDEX idx_detected_interviews_application ON detected_interviews(application_id);

-- Enable RLS
ALTER TABLE detected_interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- TQC team (admin, strategist) can view all detected interviews
CREATE POLICY "TQC team can view all detected interviews"
ON detected_interviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);

-- Users can view their own detected interviews (as organizer)
CREATE POLICY "Users can view their own detected interviews"
ON detected_interviews
FOR SELECT
TO authenticated
USING (tqc_organizer_id = auth.uid());

-- Partners can view detected interviews for their company's jobs
CREATE POLICY "Partners can view interviews for their company jobs"
ON detected_interviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    INNER JOIN user_roles ur ON ur.user_id = auth.uid()
    INNER JOIN profiles p ON p.id = auth.uid()
    WHERE j.id = detected_interviews.job_id
    AND ur.role = 'partner'
    AND j.company_id = p.company_id
  )
);

-- TQC team can insert detected interviews
CREATE POLICY "TQC team can create detected interviews"
ON detected_interviews
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);

-- Users can insert their own detected interviews
CREATE POLICY "Users can create their own detected interviews"
ON detected_interviews
FOR INSERT
TO authenticated
WITH CHECK (tqc_organizer_id = auth.uid());

-- TQC team can update any detected interview
CREATE POLICY "TQC team can update detected interviews"
ON detected_interviews
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);

-- Users can update their own detected interviews
CREATE POLICY "Users can update their own detected interviews"
ON detected_interviews
FOR UPDATE
TO authenticated
USING (tqc_organizer_id = auth.uid())
WITH CHECK (tqc_organizer_id = auth.uid());

-- TQC team can delete detected interviews
CREATE POLICY "TQC team can delete detected interviews"
ON detected_interviews
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_detected_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_detected_interviews_updated_at
BEFORE UPDATE ON detected_interviews
FOR EACH ROW
EXECUTE FUNCTION update_detected_interviews_updated_at();

-- Enable realtime for detected_interviews
ALTER PUBLICATION supabase_realtime ADD TABLE detected_interviews;
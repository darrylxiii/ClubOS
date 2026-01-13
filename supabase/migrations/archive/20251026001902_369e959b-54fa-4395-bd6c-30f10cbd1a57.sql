-- Phase 2: Create Club Sync Requests workflow tables

-- Create club_sync_requests table
CREATE TABLE IF NOT EXISTS club_sync_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_club_sync_requests_status ON club_sync_requests(status);
CREATE INDEX IF NOT EXISTS idx_club_sync_requests_job_id ON club_sync_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_club_sync_requests_requested_by ON club_sync_requests(requested_by);

-- Add RLS policies
ALTER TABLE club_sync_requests ENABLE ROW LEVEL SECURITY;

-- Partners can create requests for their company's jobs
CREATE POLICY "Partners can create club sync requests"
  ON club_sync_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN company_members cm ON cm.company_id = j.company_id
      WHERE j.id = job_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

-- Partners can view their own requests
CREATE POLICY "Partners can view their requests"
  ON club_sync_requests
  FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Admins can update requests
CREATE POLICY "Admins can update club sync requests"
  ON club_sync_requests
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger to update updated_at
CREATE TRIGGER update_club_sync_requests_updated_at
  BEFORE UPDATE ON club_sync_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE club_sync_requests IS 'Tracks Club Sync activation requests from partners, requiring admin approval';
COMMENT ON COLUMN club_sync_requests.status IS 'Request status: pending (awaiting admin review), approved (activated), declined (rejected by admin)';
COMMENT ON COLUMN club_sync_requests.notes IS 'Partner notes explaining why they want Club Sync for this role';
COMMENT ON COLUMN club_sync_requests.admin_notes IS 'Admin notes explaining approval/decline decision';
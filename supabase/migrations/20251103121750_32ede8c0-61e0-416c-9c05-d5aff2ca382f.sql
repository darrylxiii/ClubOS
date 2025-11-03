-- Add critical missing indexes for performance optimization
-- Note: Cannot use CONCURRENTLY in transaction block, so using standard CREATE INDEX

-- Index for conversations last message ordering (inbox queries)
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at 
  ON conversations(last_message_at DESC NULLS LAST)
  WHERE archived_at IS NULL;

-- Index for jobs by company and creation date (company dashboard)
CREATE INDEX IF NOT EXISTS idx_jobs_company_created 
  ON jobs(company_id, created_at DESC)
  WHERE status = 'published';

-- Index for company members lookup by user and role
CREATE INDEX IF NOT EXISTS idx_company_members_user_role 
  ON company_members(user_id, role)
  WHERE is_active = true;

-- Index for match scores by calculation date (recent matches)
CREATE INDEX IF NOT EXISTS idx_match_scores_calculated 
  ON match_scores(calculated_at DESC)
  WHERE overall_score >= 60;

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

-- Index for application status filtering
CREATE INDEX IF NOT EXISTS idx_applications_status_updated
  ON applications(status, updated_at DESC);

-- Index for job search by location and employment type
CREATE INDEX IF NOT EXISTS idx_jobs_location_type
  ON jobs(location, employment_type)
  WHERE status = 'published';
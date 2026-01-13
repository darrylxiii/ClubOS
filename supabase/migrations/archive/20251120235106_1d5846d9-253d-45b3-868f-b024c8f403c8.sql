-- Phase 2: Database Performance Optimization (Safe indexes only)
-- Add indexes for frequently queried columns that we know exist

-- Applications table - frequently filtered by status, job_id, candidate_id
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_match_score ON applications(match_score DESC) WHERE match_score IS NOT NULL;

-- Jobs table - frequently filtered by status, company_id, created_at
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Candidate profiles - frequently queried by user_id and email
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_email ON candidate_profiles(email);

-- User roles - composite index for role + user lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);

-- Notifications - frequently filtered by user + read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- Messages - frequently queried by conversation + timestamp
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Meetings - frequently filtered by host and status
CREATE INDEX IF NOT EXISTS idx_meetings_host_id ON meetings(host_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);

-- Activity feed - frequently filtered by company, user, type
CREATE INDEX IF NOT EXISTS idx_activity_feed_company_created ON activity_feed(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_created ON activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_event_type ON activity_feed(event_type);

-- Audit events - frequently queried by actor, resource, time
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);

-- Assessment results - frequently filtered by user, assignment
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_assignment_id ON assessment_results(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_latest ON assessment_results(user_id, assessment_id, is_latest) WHERE is_latest = true;

-- User achievements - frequently queried by user
CREATE INDEX IF NOT EXISTS idx_user_quantum_achievements_user ON user_quantum_achievements(user_id, unlocked_at DESC);

-- AI conversations - frequently queried by user + type
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_type ON ai_conversations(user_id, conversation_type, updated_at DESC);

COMMENT ON INDEX idx_applications_status IS 'Optimizes application filtering by status';
COMMENT ON INDEX idx_jobs_status IS 'Optimizes job board queries by status';
COMMENT ON INDEX idx_notifications_user_read IS 'Optimizes notification queries for unread counts';
COMMENT ON INDEX idx_messages_conversation_created IS 'Optimizes message thread loading';
COMMENT ON INDEX idx_activity_feed_company_created IS 'Optimizes company activity feed queries';
-- Performance Optimization Indexes
-- Add composite indexes for frequently used query patterns

-- Index for deal pipeline queries (status, is_lost, deal_stage)
CREATE INDEX IF NOT EXISTS idx_jobs_pipeline_filter 
ON public.jobs (status, is_lost, deal_stage) 
WHERE status IN ('published', 'closed') AND is_lost = false;

-- Index for applications by status and stage
CREATE INDEX IF NOT EXISTS idx_applications_status_stage 
ON public.applications (status, current_stage_index);

-- Index for applications by job_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_applications_job_lookup 
ON public.applications (job_id, status);

-- Index for candidate profiles by user_id
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user 
ON public.candidate_profiles (user_id);

-- Index for jobs ordered by created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_jobs_created_at_desc 
ON public.jobs (created_at DESC);

-- Index for companies with placement fee for pipeline calculations
CREATE INDEX IF NOT EXISTS idx_companies_fee 
ON public.companies (placement_fee_percentage) 
WHERE placement_fee_percentage IS NOT NULL;

-- Index for activity timeline by user and type
CREATE INDEX IF NOT EXISTS idx_activity_timeline_user_type 
ON public.activity_timeline (user_id, activity_type, created_at DESC);

-- Index for notifications by user and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, is_read, created_at DESC) 
WHERE is_read = false;

-- Index for messages by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
ON public.messages (conversation_id, created_at DESC);

-- Index for bookings by status
CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON public.bookings (status, created_at DESC);

-- Add comment for documentation
COMMENT ON INDEX idx_jobs_pipeline_filter IS 'Optimizes deal pipeline queries filtering by status and is_lost';
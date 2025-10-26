-- Phase 1: Add columns for real match scoring and job metadata

-- Add club_sync_status and related columns to jobs table
DO $$ BEGIN
  CREATE TYPE club_sync_status_enum AS ENUM ('not_offered', 'pending', 'accepted', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS club_sync_status club_sync_status_enum DEFAULT 'not_offered',
ADD COLUMN IF NOT EXISTS club_sync_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add match scoring columns to applications table
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
ADD COLUMN IF NOT EXISTS match_factors JSONB DEFAULT '{}'::jsonb;

-- Add application source tracking
DO $$ BEGIN
  CREATE TYPE application_source_enum AS ENUM ('direct', 'club_sync', 'referral', 'linkedin', 'careers_page', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS application_source application_source_enum DEFAULT 'direct';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_club_sync_status ON jobs(club_sync_status);
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON jobs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_applications_match_score ON applications(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_applications_source ON applications(application_source);

-- Add comment for documentation
COMMENT ON COLUMN jobs.club_sync_status IS 'Status of Club Sync feature: not_offered (default), pending (partner requested), accepted (admin approved), declined (admin rejected)';
COMMENT ON COLUMN jobs.tags IS 'Array of skill/category tags for the job posting';
COMMENT ON COLUMN applications.match_score IS 'AI-calculated match score between candidate profile and job requirements (0-100)';
COMMENT ON COLUMN applications.match_factors IS 'JSON object containing breakdown of match score factors and explanations';
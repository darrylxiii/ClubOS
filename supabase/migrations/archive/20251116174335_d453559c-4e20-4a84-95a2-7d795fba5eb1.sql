-- Phase 2: Smart Resume Capability
-- Create translation_generation_jobs table to track bulk translation progress

CREATE TABLE IF NOT EXISTS translation_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL,
  target_languages TEXT[] NOT NULL,
  completed_languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  failed_languages JSONB DEFAULT '[]'::JSONB,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'rate_limited', 'circuit_breaker')),
  total_keys_count INT DEFAULT 0,
  processed_keys_count INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_created_by ON translation_generation_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_updated_at ON translation_generation_jobs(updated_at DESC);

-- Enable RLS
ALTER TABLE translation_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own jobs
CREATE POLICY "Users can view their own translation jobs"
  ON translation_generation_jobs
  FOR SELECT
  USING (auth.uid() = created_by);

-- Allow users to create their own jobs
CREATE POLICY "Users can create their own translation jobs"
  ON translation_generation_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_translation_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_translation_job_timestamp
  BEFORE UPDATE ON translation_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_translation_job_updated_at();
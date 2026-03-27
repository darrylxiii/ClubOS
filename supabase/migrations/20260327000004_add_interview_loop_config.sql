-- Add interview_loop_config JSONB to jobs table
-- Stores multi-round interview configuration per job
-- Format: [{ "name": "Phone Screen", "interviewerIds": ["uuid1"], "durationMinutes": 30, "scorecardTemplate": "technical" }]
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interview_loop_config JSONB DEFAULT '[]'::jsonb;

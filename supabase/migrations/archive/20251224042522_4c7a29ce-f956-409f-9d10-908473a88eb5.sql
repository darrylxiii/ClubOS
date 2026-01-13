-- Create ClubAI voice sessions table for tracking voice interactions
CREATE TABLE public.clubai_voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  message_count integer DEFAULT 0,
  tools_used text[] DEFAULT '{}',
  context jsonb DEFAULT '{}',
  transcript jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for user lookups
CREATE INDEX idx_clubai_voice_sessions_user_id ON public.clubai_voice_sessions(user_id);
CREATE INDEX idx_clubai_voice_sessions_started_at ON public.clubai_voice_sessions(started_at DESC);

-- Enable RLS
ALTER TABLE public.clubai_voice_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view their own voice sessions"
ON public.clubai_voice_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own sessions
CREATE POLICY "Users can create their own voice sessions"
ON public.clubai_voice_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update their own voice sessions"
ON public.clubai_voice_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.clubai_voice_sessions IS 'Tracks ClubAI voice assistant interactions for analytics and improvements';
-- Create live_sessions table to track active broadcasts
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  current_track_id UUID REFERENCES public.tracks(id),
  current_queue_item_id UUID REFERENCES public.dj_queue(id),
  listener_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view active sessions
CREATE POLICY "Anyone can view active live sessions"
ON public.live_sessions
FOR SELECT
USING (is_active = true);

-- DJs can create their own sessions
CREATE POLICY "DJs can create their own sessions"
ON public.live_sessions
FOR INSERT
WITH CHECK (auth.uid() = dj_id);

-- DJs can update their own sessions
CREATE POLICY "DJs can update their own sessions"
ON public.live_sessions
FOR UPDATE
USING (auth.uid() = dj_id);

-- Create index for active sessions
CREATE INDEX idx_live_sessions_active ON public.live_sessions(is_active, started_at DESC) WHERE is_active = true;

-- Enable realtime for live sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
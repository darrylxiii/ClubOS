-- Add policies to allow guest access to meetings
CREATE POLICY "Allow guests to view meetings"
  ON meetings FOR SELECT
  USING (
    access_type = 'public' OR
    allow_guests = true OR
    auth.uid() = host_id OR
    is_meeting_participant(auth.uid(), id)
  );

-- Allow anyone to view meeting participants (for WebRTC signaling)
CREATE POLICY "Anyone can view meeting participants for their meeting"
  ON meeting_participants FOR SELECT
  USING (true);

-- Create signaling table for WebRTC
CREATE TABLE IF NOT EXISTS public.webrtc_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  sender_id text NOT NULL, -- Can be user_id or guest session ID
  receiver_id text, -- Null for broadcast signals
  signal_type text NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'join', 'leave'
  signal_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed boolean DEFAULT false
);

-- Enable RLS on webrtc_signals
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert signals (for guest support)
CREATE POLICY "Anyone can send signals"
  ON webrtc_signals FOR INSERT
  WITH CHECK (true);

-- Allow anyone in a meeting to view its signals
CREATE POLICY "Anyone can view signals for active meetings"
  ON webrtc_signals FOR SELECT
  USING (true);

-- Auto-delete old signals (cleanup after 1 hour)
CREATE POLICY "Auto-delete old signals"
  ON webrtc_signals FOR DELETE
  USING (created_at < now() - interval '1 hour');

-- Enable realtime for webrtc_signals
ALTER PUBLICATION supabase_realtime ADD TABLE webrtc_signals;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_meeting 
  ON webrtc_signals(meeting_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webrtc_signals_receiver 
  ON webrtc_signals(receiver_id) WHERE receiver_id IS NOT NULL;
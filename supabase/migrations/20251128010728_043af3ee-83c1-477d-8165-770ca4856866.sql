-- Add missing fields to live_channels if not exists
ALTER TABLE live_channels
ADD COLUMN IF NOT EXISTS auto_record boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_transcribe boolean DEFAULT false;

-- Create livehub_channel_participants table for stage channels
CREATE TABLE IF NOT EXISTS livehub_channel_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES live_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'listener' CHECK (role IN ('host', 'speaker', 'listener')),
  is_muted boolean DEFAULT true,
  is_video_on boolean DEFAULT false,
  is_hand_raised boolean DEFAULT false,
  is_speaking boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id, left_at)
);

-- Enable RLS
ALTER TABLE livehub_channel_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view participants in their channels"
  ON livehub_channel_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join channels"
  ON livehub_channel_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant record"
  ON livehub_channel_participants FOR UPDATE
  USING (auth.uid() = user_id OR 
         EXISTS (
           SELECT 1 FROM livehub_channel_participants 
           WHERE channel_id = livehub_channel_participants.channel_id 
           AND user_id = auth.uid() 
           AND role = 'host'
         ));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE livehub_channel_participants;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_livehub_participants_channel 
  ON livehub_channel_participants(channel_id, left_at);

CREATE INDEX IF NOT EXISTS idx_livehub_participants_user 
  ON livehub_channel_participants(user_id);
-- Phase 1: Core LiveHub Fixes

-- 1. Add edit tracking columns to messages
ALTER TABLE live_channel_messages 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mentions UUID[];

-- 2. Create read states table for unread tracking
CREATE TABLE IF NOT EXISTS live_channel_read_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES live_channels(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES live_channel_messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- 3. Create user channel settings table
CREATE TABLE IF NOT EXISTS live_channel_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES live_channels(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT FALSE,
  notification_level TEXT DEFAULT 'all' CHECK (notification_level IN ('all', 'mentions', 'none')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- 4. Enable RLS on new tables
ALTER TABLE live_channel_read_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_channel_user_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for read_states
CREATE POLICY "Users can view their own read states"
  ON live_channel_read_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read states"
  ON live_channel_read_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read states"
  ON live_channel_read_states FOR UPDATE
  USING (auth.uid() = user_id);

-- 6. RLS Policies for user_settings
CREATE POLICY "Users can view their own channel settings"
  ON live_channel_user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own channel settings"
  ON live_channel_user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channel settings"
  ON live_channel_user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE live_channel_read_states;
ALTER PUBLICATION supabase_realtime ADD TABLE live_channel_user_settings;

-- 8. Function to update unread counts
CREATE OR REPLACE FUNCTION update_unread_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment unread count for all users in this channel except the sender
  UPDATE live_channel_read_states
  SET unread_count = unread_count + 1,
      updated_at = NOW()
  WHERE channel_id = NEW.channel_id
    AND user_id != NEW.user_id;
  
  -- Insert read state for users who don't have one yet
  INSERT INTO live_channel_read_states (user_id, channel_id, unread_count, last_read_at)
  SELECT 
    sm.user_id, 
    NEW.channel_id, 
    1,
    NOW()
  FROM live_server_members sm
  INNER JOIN live_channels lc ON lc.server_id = sm.server_id
  WHERE lc.id = NEW.channel_id
    AND sm.user_id != NEW.user_id
    AND NOT EXISTS (
      SELECT 1 FROM live_channel_read_states 
      WHERE user_id = sm.user_id AND channel_id = NEW.channel_id
    )
  ON CONFLICT (user_id, channel_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger for unread counts
DROP TRIGGER IF EXISTS trigger_update_unread_counts ON live_channel_messages;
CREATE TRIGGER trigger_update_unread_counts
  AFTER INSERT ON live_channel_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_counts();

-- 10. Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_channel_as_read(p_channel_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO live_channel_read_states (user_id, channel_id, unread_count, last_read_at)
  VALUES (p_user_id, p_channel_id, 0, NOW())
  ON CONFLICT (user_id, channel_id) 
  DO UPDATE SET 
    unread_count = 0,
    last_read_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
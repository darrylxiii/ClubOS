-- Phase 1: Meeting-Message Integration & Performance Enhancements

-- 1. Add meeting_id to messages for linking meetings to message threads
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_meeting_id ON messages(meeting_id);

-- 2. Add system_message_type for different system message categories  
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS system_message_type TEXT;

-- 3. Add composite indexes for performance (eliminate N+1 queries)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender_date 
ON messages(conversation_id, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
ON conversation_participants(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages(conversation_id, read_at) 
WHERE read_at IS NULL;

-- 4. Add rate limiting table
CREATE TABLE IF NOT EXISTS message_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  message_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Rate limiting function (30 messages per minute)
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  SELECT message_count, message_rate_limits.window_start 
  INTO current_count, window_start
  FROM message_rate_limits
  WHERE user_id = NEW.sender_id;
  
  IF NOT FOUND THEN
    INSERT INTO message_rate_limits (user_id, message_count, window_start, last_message_at)
    VALUES (NEW.sender_id, 1, NOW(), NOW());
    RETURN NEW;
  END IF;
  
  IF window_start < NOW() - INTERVAL '1 minute' THEN
    UPDATE message_rate_limits 
    SET message_count = 1, 
        window_start = NOW(),
        last_message_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.sender_id;
    RETURN NEW;
  END IF;
  
  IF current_count >= 30 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending more messages.';
  END IF;
  
  UPDATE message_rate_limits 
  SET message_count = current_count + 1, 
      last_message_at = NOW(),
      updated_at = NOW()
  WHERE user_id = NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_message_rate_limit ON messages;
CREATE TRIGGER enforce_message_rate_limit
BEFORE INSERT ON messages
FOR EACH ROW 
WHEN (NEW.message_type = 'text')
EXECUTE FUNCTION check_message_rate_limit();
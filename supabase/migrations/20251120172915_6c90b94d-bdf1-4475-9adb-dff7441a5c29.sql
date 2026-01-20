-- Fix RLS for message_rate_limits table
ALTER TABLE message_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own rate limit data
CREATE POLICY "Users manage own rate limits"
ON message_rate_limits
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fix search path for check_message_rate_limit function
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
-- Phase 1: Live Session Data Flow Fixes

-- 1. Create live_session_listeners table to track who's listening
CREATE TABLE IF NOT EXISTS live_session_listeners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(session_id, user_id, ip_address)
);

-- Create indexes for performance
CREATE INDEX idx_live_session_listeners_session ON live_session_listeners(session_id, is_active);
CREATE INDEX idx_live_session_listeners_active ON live_session_listeners(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE live_session_listeners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active listeners"
  ON live_session_listeners FOR SELECT
  USING (true);

CREATE POLICY "Users can register themselves as listeners"
  ON live_session_listeners FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can mark themselves as left"
  ON live_session_listeners FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- 2. Function to update listener_count in live_sessions
CREATE OR REPLACE FUNCTION update_listener_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the listener_count for the affected session
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE live_sessions
    SET listener_count = (
      SELECT COUNT(*)
      FROM live_session_listeners
      WHERE session_id = NEW.session_id
        AND is_active = true
    )
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE live_sessions
    SET listener_count = (
      SELECT COUNT(*)
      FROM live_session_listeners
      WHERE session_id = OLD.session_id
        AND is_active = true
    )
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update listener_count
DROP TRIGGER IF EXISTS trigger_update_listener_count ON live_session_listeners;
CREATE TRIGGER trigger_update_listener_count
  AFTER INSERT OR UPDATE OR DELETE ON live_session_listeners
  FOR EACH ROW
  EXECUTE FUNCTION update_listener_count();

-- 3. Function to register a listener (insert or update)
CREATE OR REPLACE FUNCTION register_listener(
  p_session_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_listener_id UUID;
BEGIN
  -- Insert or update listener record
  INSERT INTO live_session_listeners (session_id, user_id, ip_address, is_active)
  VALUES (p_session_id, p_user_id, p_ip_address, true)
  ON CONFLICT (session_id, user_id, ip_address) 
  DO UPDATE SET 
    is_active = true,
    left_at = NULL,
    joined_at = now()
  RETURNING id INTO v_listener_id;
  
  RETURN v_listener_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to unregister a listener
CREATE OR REPLACE FUNCTION unregister_listener(
  p_session_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE live_session_listeners
  SET is_active = false,
      left_at = now()
  WHERE session_id = p_session_id
    AND (user_id = p_user_id OR (user_id IS NULL AND ip_address = p_ip_address));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add index on live_sessions.current_track_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_live_sessions_current_track 
  ON live_sessions(current_track_id) WHERE current_track_id IS NOT NULL;
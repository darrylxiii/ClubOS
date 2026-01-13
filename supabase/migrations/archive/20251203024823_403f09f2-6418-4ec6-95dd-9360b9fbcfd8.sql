-- Create function to cleanup stale voice participants (older than 60 seconds)
CREATE OR REPLACE FUNCTION cleanup_stale_voice_participants()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM live_channel_participants
  WHERE last_activity_at < NOW() - INTERVAL '60 seconds';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Create function for sendBeacon cleanup on tab close (accepts anon key auth)
CREATE OR REPLACE FUNCTION leave_voice_channel(p_channel_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM live_channel_participants
  WHERE channel_id = p_channel_id AND user_id = p_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_stale_voice_participants() TO authenticated;
GRANT EXECUTE ON FUNCTION leave_voice_channel(uuid, uuid) TO authenticated;

-- Create index for faster stale participant queries
CREATE INDEX IF NOT EXISTS idx_live_channel_participants_last_activity 
ON live_channel_participants(last_activity_at);
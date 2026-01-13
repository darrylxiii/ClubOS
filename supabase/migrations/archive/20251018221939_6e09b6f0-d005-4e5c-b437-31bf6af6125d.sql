-- Drop existing problematic policies for video_call_participants
DROP POLICY IF EXISTS "Users can view participants in their sessions" ON video_call_participants;
DROP POLICY IF EXISTS "Users can join sessions" ON video_call_participants;
DROP POLICY IF EXISTS "Users can update their participant status" ON video_call_participants;
DROP POLICY IF EXISTS "Users can view their own participant records" ON video_call_participants;

-- Drop existing problematic policies for video_call_sessions
DROP POLICY IF EXISTS "Users can view sessions they participate in" ON video_call_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON video_call_sessions;
DROP POLICY IF EXISTS "Hosts can update their sessions" ON video_call_sessions;
DROP POLICY IF EXISTS "Hosts can delete their sessions" ON video_call_sessions;

-- Create non-recursive policies for video_call_sessions
CREATE POLICY "Users can view all active sessions"
  ON video_call_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create sessions"
  ON video_call_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own sessions"
  ON video_call_sessions FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own sessions"
  ON video_call_sessions FOR DELETE
  USING (auth.uid() = host_id);

-- Create non-recursive policies for video_call_participants
CREATE POLICY "Users can view all participants"
  ON video_call_participants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can join as participants"
  ON video_call_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant record"
  ON video_call_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participant record"
  ON video_call_participants FOR DELETE
  USING (auth.uid() = user_id);
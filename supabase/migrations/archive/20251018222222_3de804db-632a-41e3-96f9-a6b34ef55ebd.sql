-- Step 1: Drop ALL existing policies on both tables to start fresh
DROP POLICY IF EXISTS "Users can view all participants" ON video_call_participants;
DROP POLICY IF EXISTS "Participants can view other participants in their sessions" ON video_call_participants;
DROP POLICY IF EXISTS "Authenticated users can join as participants" ON video_call_participants;
DROP POLICY IF EXISTS "Users can join as participants" ON video_call_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON video_call_participants;
DROP POLICY IF EXISTS "Participants can update their own data" ON video_call_participants;
DROP POLICY IF EXISTS "Users can delete their own participant record" ON video_call_participants;

DROP POLICY IF EXISTS "Users can view all active sessions" ON video_call_sessions;
DROP POLICY IF EXISTS "Users can view sessions they're part of" ON video_call_sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON video_call_sessions;
DROP POLICY IF EXISTS "Hosts can create sessions" ON video_call_sessions;
DROP POLICY IF EXISTS "Hosts can update their own sessions" ON video_call_sessions;
DROP POLICY IF EXISTS "Hosts can delete their own sessions" ON video_call_sessions;

-- Step 2: Create a security definer function to safely check session participation
CREATE OR REPLACE FUNCTION public.user_in_video_session(session_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM video_call_participants
    WHERE session_id = session_id_param
    AND user_id = user_id_param
    AND left_at IS NULL
  );
$$;

-- Step 3: Create simple, non-recursive policies for video_call_sessions
CREATE POLICY "Anyone can view sessions"
  ON video_call_sessions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON video_call_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update sessions"
  ON video_call_sessions FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete sessions"
  ON video_call_sessions FOR DELETE
  USING (auth.uid() = host_id);

-- Step 4: Create simple, non-recursive policies for video_call_participants
CREATE POLICY "Anyone can view participants"
  ON video_call_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join sessions"
  ON video_call_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own participant data"
  ON video_call_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own participant data"
  ON video_call_participants FOR DELETE
  USING (auth.uid() = user_id);
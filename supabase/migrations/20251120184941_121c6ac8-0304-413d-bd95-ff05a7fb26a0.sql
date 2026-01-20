-- Comprehensive RLS fix for messaging system
-- Remove all recursive and problematic policies, create clean non-recursive ones

-- ============================================================
-- 1. CLEAN UP conversation_participants RLS
-- ============================================================

-- Drop ALL existing SELECT policies on conversation_participants (they're causing recursion)
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users view own participations (non-recursive)" ON conversation_participants;
DROP POLICY IF EXISTS "Participants see all in their conversations" ON conversation_participants;

-- Create single, simple, non-recursive SELECT policy
CREATE POLICY "Users view own participations"
  ON conversation_participants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'strategist'::app_role)
  );

-- Verify INSERT/UPDATE/DELETE policies are non-recursive (keep them)
-- These should already exist and be correct:
-- - "Authenticated can insert participations" (INSERT, WITH CHECK auth.uid() IS NOT NULL)
-- - "Participants update own participation" (UPDATE, USING user_id = auth.uid())
-- - "Participants delete own participation" (DELETE, USING user_id = auth.uid())
-- - "Users can update their own participant settings" (UPDATE, both USING & WITH CHECK user_id = auth.uid())

-- ============================================================
-- 2. VERIFY conversations RLS (non-recursive, should be fine)
-- ============================================================

-- These policies are fine because they query conversation_participants (different table):
-- - "Create conversations" (INSERT)
-- - "View participating conversations" (SELECT, uses EXISTS on conversation_participants)
-- - Update policies (also use EXISTS on conversation_participants)

-- ============================================================
-- 3. HARDEN messages RLS
-- ============================================================

-- Drop any duplicate SELECT policies
DROP POLICY IF EXISTS "Participants read messages" ON messages;
DROP POLICY IF EXISTS "Participants can read messages" ON messages;

-- Create single SELECT policy for reading messages
CREATE POLICY "Participants read conversation messages"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'strategist'::app_role)
  );

-- Keep existing INSERT policy (should exist):
-- "Participants can send messages" (INSERT, uses EXISTS on conversation_participants)

-- ============================================================
-- 4. CLEAN UP message_notifications RLS
-- ============================================================

-- Drop duplicate policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON message_notifications;
DROP POLICY IF EXISTS "Users read own notifications" ON message_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON message_notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON message_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON message_notifications;

-- Create clean, non-duplicate policies
CREATE POLICY "Users read own notifications"
  ON message_notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON message_notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System notifications are created via triggers, authenticated users can insert their own
CREATE POLICY "Authenticated insert notifications"
  ON message_notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. CREATE SECURE HELPER FUNCTION FOR PARTICIPANT DATA
-- ============================================================

-- This function allows users to see ALL participants in conversations they're part of
-- without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_conversation_participants(_conversation_id uuid)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  last_read_at timestamptz,
  notifications_enabled boolean,
  is_muted boolean,
  full_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a participant
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = _conversation_id
      AND conversation_participants.user_id = auth.uid()
  ) AND NOT (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'strategist'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to view participants';
  END IF;

  -- Return all participants with profile data
  RETURN QUERY
  SELECT 
    cp.id,
    cp.conversation_id,
    cp.user_id,
    cp.role,
    cp.joined_at,
    cp.last_read_at,
    cp.notifications_enabled,
    cp.is_muted,
    p.full_name,
    p.avatar_url
  FROM conversation_participants cp
  LEFT JOIN profiles p ON p.id = cp.user_id
  WHERE cp.conversation_id = _conversation_id;
END;
$$;
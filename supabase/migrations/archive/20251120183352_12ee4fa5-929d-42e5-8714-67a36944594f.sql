-- Fix infinite recursion in conversation_participants policy by removing self-referential SELECT

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Participants see all in their conversations" ON conversation_participants;

-- Replace with a simple non-recursive policy where users only see their own participation rows
CREATE POLICY "Users view own participations (non-recursive)"
  ON conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());
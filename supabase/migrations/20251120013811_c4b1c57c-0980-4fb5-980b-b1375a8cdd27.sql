-- Drop the track_user_event function that references a non-existent table
-- This function was created but the user_activity_events table doesn't exist
DROP FUNCTION IF EXISTS public.track_user_event(
  UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, INTEGER
);

-- Comment: This function referenced user_activity_events table which doesn't exist.
-- If activity tracking is needed in the future, both the table and function should be created together.
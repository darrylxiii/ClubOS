-- Fix search_path warnings for LiveHub functions

ALTER FUNCTION update_unread_counts() SET search_path = public, pg_temp;
ALTER FUNCTION mark_channel_as_read(UUID, UUID) SET search_path = public, pg_temp;
-- Fix function search path security warning
ALTER FUNCTION is_conversation_participant(UUID, UUID) SET search_path = public;
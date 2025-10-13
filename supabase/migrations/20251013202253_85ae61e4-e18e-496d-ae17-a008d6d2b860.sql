-- Fix duplicate notification issue
-- Update the create_message_notifications function to handle conflicts
CREATE OR REPLACE FUNCTION public.create_message_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.message_notifications (user_id, message_id)
  SELECT cp.user_id, NEW.id
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
  AND cp.user_id != NEW.sender_id
  AND cp.notifications_enabled = true
  AND cp.is_muted = false
  ON CONFLICT (user_id, message_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
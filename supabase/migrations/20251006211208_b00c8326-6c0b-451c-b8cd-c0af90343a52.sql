-- Fix security warnings: Add SET search_path to functions that are missing it

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  recipient_id UUID;
BEGIN
  -- Get all participants except the sender
  FOR recipient_id IN
    SELECT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
    VALUES (
      recipient_id,
      'New message',
      LEFT(NEW.content, 100),
      'message',
      '/messages',
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_read_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Create read receipt when notification is marked as read
  IF NEW.is_read = true AND OLD.is_read = false THEN
    INSERT INTO public.message_read_receipts (message_id, user_id, read_at)
    VALUES (NEW.message_id, NEW.user_id, NEW.read_at)
    ON CONFLICT (message_id, user_id) DO UPDATE
    SET read_at = NEW.read_at;
  END IF;
  RETURN NEW;
END;
$function$;
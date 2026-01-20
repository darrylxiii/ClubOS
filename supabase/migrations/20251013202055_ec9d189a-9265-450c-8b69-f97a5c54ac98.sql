-- Ensure triggers exist for message notifications
-- Drop existing triggers if they exist to recreate them
DROP TRIGGER IF EXISTS on_message_created_notify ON public.messages;
DROP TRIGGER IF EXISTS on_message_created_notification ON public.messages;

-- Trigger to create message notifications for all participants
CREATE TRIGGER on_message_created_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notifications();

-- Enable realtime for group chat functionality
-- Note: These may already exist, which is fine
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
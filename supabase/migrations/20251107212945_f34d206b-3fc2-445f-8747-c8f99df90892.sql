-- Fix notification URLs to include proper deep links

-- Update notify_new_message to include conversation ID in action_url
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
BEGIN
  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

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
      'New message from ' || COALESCE(sender_name, 'Someone'),
      LEFT(NEW.content, 100),
      'message',
      '/messages/' || NEW.conversation_id,
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update process_note_mentions to include deep link to notes section with noteId
CREATE OR REPLACE FUNCTION public.process_note_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mentioned_user_id UUID;
  v_mentioned_users UUID[];
  v_candidate_name TEXT;
  v_creator_name TEXT;
BEGIN
  -- Extract mentioned user IDs from content
  v_mentioned_users := extract_mentions_from_note(NEW.content);
  
  -- Get candidate name and creator name for notifications
  SELECT full_name INTO v_candidate_name
  FROM profiles
  WHERE id = (SELECT user_id FROM candidate_profiles WHERE id = NEW.candidate_id LIMIT 1);
  
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE id = NEW.created_by;
  
  -- Create mention records and notifications for each mentioned user
  FOREACH v_mentioned_user_id IN ARRAY v_mentioned_users
  LOOP
    -- Insert mention record
    INSERT INTO note_mentions (note_id, mentioned_user_id, notified_at)
    VALUES (NEW.id, v_mentioned_user_id, now())
    ON CONFLICT (note_id, mentioned_user_id) DO NOTHING;
    
    -- Create in-app notification with deep link to notes tab and specific note
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      category,
      action_url,
      metadata,
      is_read
    ) VALUES (
      v_mentioned_user_id,
      'You were mentioned in a note',
      COALESCE(v_creator_name, 'Someone') || ' mentioned you in a note about ' || COALESCE(v_candidate_name, 'a candidate'),
      'mention',
      'notes',
      '/candidate/' || NEW.candidate_id || '?tab=team-assessment&section=notes&noteId=' || NEW.id,
      jsonb_build_object(
        'note_id', NEW.id,
        'candidate_id', NEW.candidate_id,
        'created_by', NEW.created_by,
        'note_type', NEW.note_type
      ),
      false
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;
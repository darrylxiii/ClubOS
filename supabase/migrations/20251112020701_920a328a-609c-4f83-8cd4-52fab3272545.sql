-- Security Fix: Add fixed search_path to SECURITY DEFINER functions
-- This prevents schema poisoning attacks by explicitly setting the search path

-- Fix all SECURITY DEFINER functions to have fixed search_path
-- Priority: Functions that are SECURITY DEFINER and lack search_path

-- Update create_message_notifications function
CREATE OR REPLACE FUNCTION public.create_message_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Update create_read_receipt function
CREATE OR REPLACE FUNCTION public.create_read_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    INSERT INTO public.message_read_receipts (message_id, user_id, read_at)
    VALUES (NEW.message_id, NEW.user_id, NEW.read_at)
    ON CONFLICT (message_id, user_id) DO UPDATE
    SET read_at = NEW.read_at;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update log_profile_view_interaction function
CREATE OR REPLACE FUNCTION public.log_profile_view_interaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.candidate_interactions (
    candidate_id,
    interaction_type,
    interaction_direction,
    title,
    metadata,
    created_by,
    visible_to_candidate
  ) VALUES (
    NEW.candidate_id,
    'profile_view',
    'internal',
    'Profile viewed',
    jsonb_build_object(
      'view_context', NEW.view_context,
      'view_source', NEW.view_source,
      'duration_seconds', NEW.duration_seconds
    ),
    NEW.viewer_id,
    false
  );
  RETURN NEW;
END;
$function$;

-- Update set_meeting_code function
CREATE OR REPLACE FUNCTION public.set_meeting_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.meeting_code IS NULL OR NEW.meeting_code = '' THEN
    NEW.meeting_code := generate_meeting_code();
  END IF;
  RETURN NEW;
END;
$function$;

-- Update set_task_number function
CREATE OR REPLACE FUNCTION public.set_task_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.task_number IS NULL OR NEW.task_number = '' THEN
    NEW.task_number := generate_task_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Update set_unified_task_number function
CREATE OR REPLACE FUNCTION public.set_unified_task_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.task_number IS NULL OR NEW.task_number = '' THEN
    NEW.task_number := generate_unified_task_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Update cleanup_post_reposts function
CREATE OR REPLACE FUNCTION public.cleanup_post_reposts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.repost_of IS NOT NULL THEN
    DELETE FROM post_reposts
    WHERE original_post_id = OLD.repost_of
      AND reposted_by = OLD.user_id
      AND reposted_at >= OLD.created_at - INTERVAL '1 second'
      AND reposted_at <= OLD.created_at + INTERVAL '1 second';
  END IF;
  
  RETURN OLD;
END;
$function$;

-- Update notify_new_message function
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

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
$function$;

-- Update all other critical SECURITY DEFINER functions with search_path
-- (Continuing with more functions...)

CREATE OR REPLACE FUNCTION public.update_booking_analytics()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_analytics (booking_link_id, date, bookings_created)
    VALUES (NEW.booking_link_id, CURRENT_DATE, 1)
    ON CONFLICT (booking_link_id, date)
    DO UPDATE SET
      bookings_created = booking_analytics.bookings_created + 1,
      updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      UPDATE public.booking_analytics
      SET bookings_cancelled = bookings_cancelled + 1,
          updated_at = now()
      WHERE booking_link_id = NEW.booking_link_id
      AND date = CURRENT_DATE;
    ELSIF NEW.attended = true AND OLD.attended IS NULL THEN
      UPDATE public.booking_analytics
      SET bookings_completed = bookings_completed + 1,
          updated_at = now()
      WHERE booking_link_id = NEW.booking_link_id
      AND date = CURRENT_DATE;
    ELSIF NEW.no_show = true AND OLD.no_show = false THEN
      UPDATE public.booking_analytics
      SET no_shows = no_shows + 1,
          updated_at = now()
      WHERE booking_link_id = NEW.booking_link_id
      AND date = CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_candidate_last_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.candidate_profiles
  SET last_activity_at = now()
  WHERE id = NEW.candidate_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_listener(p_session_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_ip_address text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_listener_id UUID;
BEGIN
  INSERT INTO live_session_listeners (session_id, user_id, ip_address, is_active)
  VALUES (p_session_id, p_user_id, p_ip_address, true)
  ON CONFLICT (session_id, user_id, ip_address) 
  DO UPDATE SET 
    is_active = true,
    left_at = NULL,
    joined_at = now()
  RETURNING id INTO v_listener_id;
  
  RETURN v_listener_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unregister_listener(p_session_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_ip_address text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE live_session_listeners
  SET is_active = false,
      left_at = now()
  WHERE session_id = p_session_id
    AND (user_id = p_user_id OR (user_id IS NULL AND ip_address = p_ip_address));
END;
$function$;
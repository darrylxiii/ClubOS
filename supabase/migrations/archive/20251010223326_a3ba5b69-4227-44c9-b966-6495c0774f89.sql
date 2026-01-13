-- Fix database functions missing search_path to prevent search path manipulation attacks

-- 1. Fix update_conversation_last_message
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

-- 2. Fix update_candidate_last_activity
CREATE OR REPLACE FUNCTION public.update_candidate_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.candidate_profiles
  SET last_activity_at = now()
  WHERE id = NEW.candidate_id;
  RETURN NEW;
END;
$function$;

-- 3. Fix auto_generate_referral_code
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Fix log_profile_view_interaction
CREATE OR REPLACE FUNCTION public.log_profile_view_interaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 5. Fix track_share_link_view
CREATE OR REPLACE FUNCTION public.track_share_link_view(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  link_user_id UUID;
BEGIN
  UPDATE public.profile_share_links
  SET view_count = view_count + 1,
      last_viewed_at = NOW()
  WHERE token = _token
    AND expires_at > NOW()
  RETURNING user_id INTO link_user_id;
  
  RETURN link_user_id;
END;
$function$;

-- 6. Fix update_conversation_stats
CREATE OR REPLACE FUNCTION public.update_conversation_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  sender_role TEXT;
BEGIN
  SELECT cp.role INTO sender_role
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
  AND cp.user_id = NEW.sender_id;

  INSERT INTO public.conversation_stats (conversation_id, total_messages)
  VALUES (NEW.conversation_id, 1)
  ON CONFLICT (conversation_id)
  DO UPDATE SET
    total_messages = conversation_stats.total_messages + 1,
    candidate_messages = CASE WHEN sender_role = 'candidate' 
      THEN conversation_stats.candidate_messages + 1 
      ELSE conversation_stats.candidate_messages END,
    hiring_manager_messages = CASE WHEN sender_role = 'hiring_manager' 
      THEN conversation_stats.hiring_manager_messages + 1 
      ELSE conversation_stats.hiring_manager_messages END,
    strategist_messages = CASE WHEN sender_role = 'strategist' 
      THEN conversation_stats.strategist_messages + 1 
      ELSE conversation_stats.strategist_messages END,
    last_candidate_message_at = CASE WHEN sender_role = 'candidate' 
      THEN NEW.created_at 
      ELSE conversation_stats.last_candidate_message_at END,
    last_hiring_manager_message_at = CASE WHEN sender_role = 'hiring_manager' 
      THEN NEW.created_at 
      ELSE conversation_stats.last_hiring_manager_message_at END,
    updated_at = NOW();

  RETURN NEW;
END;
$function$;

-- 7. Fix create_message_notifications
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
  AND cp.is_muted = false;

  RETURN NEW;
END;
$function$;
-- ============================================
-- PHASE 1: Create 5 missing activity feed triggers
-- ============================================

-- 1. Application Submitted Trigger
CREATE OR REPLACE FUNCTION public.log_application_to_activity_feed()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_feed (user_id, event_type, event_data, visibility, created_at)
  VALUES (
    NEW.candidate_id,
    'application_submitted',
    jsonb_build_object(
      'application_id', NEW.id,
      'job_id', NEW.job_id,
      'status', NEW.status
    ),
    'private',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS application_submitted_activity_trigger ON public.applications;
CREATE TRIGGER application_submitted_activity_trigger
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_application_to_activity_feed();

-- 2. Application Status Change Trigger
CREATE OR REPLACE FUNCTION public.log_application_status_change_to_activity_feed()
RETURNS TRIGGER AS $$
DECLARE
  visibility_setting text;
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Make 'hired' status public for celebration, others private
    visibility_setting := CASE WHEN NEW.status = 'hired' THEN 'public' ELSE 'private' END;
    
    INSERT INTO public.activity_feed (user_id, event_type, event_data, visibility, created_at)
    VALUES (
      NEW.candidate_id,
      'application_status_change',
      jsonb_build_object(
        'application_id', NEW.id,
        'job_id', NEW.job_id,
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      visibility_setting,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS application_status_change_activity_trigger ON public.applications;
CREATE TRIGGER application_status_change_activity_trigger
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_application_status_change_to_activity_feed();

-- 3. Achievement Unlocked Trigger
CREATE OR REPLACE FUNCTION public.log_achievement_to_activity_feed()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_feed (user_id, event_type, event_data, visibility, created_at)
  VALUES (
    NEW.user_id,
    'achievement_unlocked',
    jsonb_build_object(
      'achievement_id', NEW.achievement_id,
      'unlocked_at', NEW.unlocked_at
    ),
    'public',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS achievement_unlocked_activity_trigger ON public.user_quantum_achievements;
CREATE TRIGGER achievement_unlocked_activity_trigger
  AFTER INSERT ON public.user_quantum_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.log_achievement_to_activity_feed();

-- 4. Meeting/Interview Scheduled Trigger
CREATE OR REPLACE FUNCTION public.log_meeting_to_activity_feed()
RETURNS TRIGGER AS $$
BEGIN
  -- Log for the booking user
  INSERT INTO public.activity_feed (user_id, event_type, event_data, visibility, created_at)
  VALUES (
    COALESCE(NEW.candidate_id, NEW.user_id),
    'meeting_scheduled',
    jsonb_build_object(
      'booking_id', NEW.id,
      'scheduled_start', NEW.scheduled_start,
      'scheduled_end', NEW.scheduled_end,
      'meeting_type', NEW.meeting_type,
      'is_interview', NEW.is_interview_booking
    ),
    'private',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS meeting_scheduled_activity_trigger ON public.bookings;
CREATE TRIGGER meeting_scheduled_activity_trigger
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_meeting_to_activity_feed();

-- 5. Profile Updated Trigger (for significant changes)
CREATE OR REPLACE FUNCTION public.log_profile_update_to_activity_feed()
RETURNS TRIGGER AS $$
DECLARE
  changes_made jsonb := '{}'::jsonb;
  significant_change boolean := false;
BEGIN
  -- Track significant profile changes
  IF OLD.current_title IS DISTINCT FROM NEW.current_title AND NEW.current_title IS NOT NULL THEN
    changes_made := changes_made || jsonb_build_object('current_title', NEW.current_title);
    significant_change := true;
  END IF;
  
  IF OLD.bio IS DISTINCT FROM NEW.bio AND NEW.bio IS NOT NULL AND length(NEW.bio) > 50 THEN
    changes_made := changes_made || jsonb_build_object('bio_updated', true);
    significant_change := true;
  END IF;
  
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url AND NEW.avatar_url IS NOT NULL THEN
    changes_made := changes_made || jsonb_build_object('avatar_updated', true);
    significant_change := true;
  END IF;

  -- Only log if there was a significant change
  IF significant_change THEN
    INSERT INTO public.activity_feed (user_id, event_type, event_data, visibility, created_at)
    VALUES (
      NEW.id,
      'profile_updated',
      changes_made,
      'private',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profile_updated_activity_trigger ON public.profiles;
CREATE TRIGGER profile_updated_activity_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_update_to_activity_feed();

-- 6. Fix profile_views RLS to allow inserts
DROP POLICY IF EXISTS "Allow authenticated users to insert profile views" ON public.profile_views;
CREATE POLICY "Allow authenticated users to insert profile views" 
  ON public.profile_views
  FOR INSERT 
  TO authenticated
  WITH CHECK (viewer_user_id = auth.uid());

-- 7. Allow users to view their own profile view stats
DROP POLICY IF EXISTS "Users can view their own profile views" ON public.profile_views;
CREATE POLICY "Users can view their own profile views"
  ON public.profile_views
  FOR SELECT
  TO authenticated
  USING (viewed_user_id = auth.uid());
-- Phase 5: Attach Database Triggers to Existing Functions
-- These functions already exist but are not connected to tables

-- 1. Application submitted trigger
DROP TRIGGER IF EXISTS application_activity_trigger ON public.applications;
CREATE TRIGGER application_activity_trigger
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_application_to_activity_feed();

-- 2. Application status change trigger
DROP TRIGGER IF EXISTS application_status_change_trigger ON public.applications;
CREATE TRIGGER application_status_change_trigger
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_application_status_change_to_activity_feed();

-- 3. Achievement unlocked trigger
DROP TRIGGER IF EXISTS achievement_activity_trigger ON public.user_quantum_achievements;
CREATE TRIGGER achievement_activity_trigger
  AFTER INSERT ON public.user_quantum_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.log_achievement_to_activity_feed();

-- 4. Meeting scheduled trigger
DROP TRIGGER IF EXISTS meeting_activity_trigger ON public.meeting_participants;
CREATE TRIGGER meeting_activity_trigger
  AFTER INSERT ON public.meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.log_meeting_to_activity_feed();

-- 5. Profile update trigger (significant changes only)
DROP TRIGGER IF EXISTS profile_update_activity_trigger ON public.profiles;
CREATE TRIGGER profile_update_activity_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
    OLD.bio IS DISTINCT FROM NEW.bio
  )
  EXECUTE FUNCTION public.log_profile_update_to_activity_feed();

-- 6. Referral sent trigger
DROP TRIGGER IF EXISTS referral_activity_trigger ON public.referral_network;
CREATE TRIGGER referral_activity_trigger
  AFTER INSERT ON public.referral_network
  FOR EACH ROW
  EXECUTE FUNCTION public.log_referral_to_activity_feed();
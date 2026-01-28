-- ================================================
-- Activity Feed Population Triggers (Part 2)
-- Referral trigger using correct table name
-- ================================================

-- Referral created trigger (using referral_network table)
CREATE OR REPLACE FUNCTION public.log_referral_to_activity_feed()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_feed (user_id, event_type, event_data, visibility, created_at)
  VALUES (
    NEW.referrer_id,
    'referral_sent',
    jsonb_build_object(
      'referral_id', NEW.id,
      'referred_id', NEW.referred_id
    ),
    'private',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS referral_activity_feed_trigger ON public.referral_network;
CREATE TRIGGER referral_activity_feed_trigger
  AFTER INSERT ON public.referral_network
  FOR EACH ROW
  EXECUTE FUNCTION public.log_referral_to_activity_feed();
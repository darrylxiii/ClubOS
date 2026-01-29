-- Drop the old restrictive constraint
ALTER TABLE public.activity_feed DROP CONSTRAINT IF EXISTS activity_feed_event_type_check;

-- Add a new constraint with all the event types used by triggers
ALTER TABLE public.activity_feed 
ADD CONSTRAINT activity_feed_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'interview_scheduled'::text, 
  'job_applied'::text, 
  'offer_received'::text, 
  'profile_updated'::text, 
  'job_published'::text, 
  'company_milestone'::text, 
  'profile_view'::text, 
  'connection_made'::text,
  'achievement_unlocked'::text,
  'application_submitted'::text,
  'application_status_change'::text,
  'meeting_scheduled'::text,
  'referral_sent'::text,
  'user_signup'::text
]));
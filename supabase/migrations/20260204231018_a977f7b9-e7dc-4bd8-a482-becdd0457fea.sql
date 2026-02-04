-- Fix: Add 'application_response_time' to allowed metric types
-- This allows the trigger_create_sla_tracking() function to work correctly

ALTER TABLE partner_sla_tracking 
DROP CONSTRAINT IF EXISTS partner_sla_tracking_metric_check;

ALTER TABLE partner_sla_tracking 
ADD CONSTRAINT partner_sla_tracking_metric_check 
CHECK (metric_type = ANY (ARRAY[
  'response_time'::text, 
  'shortlist_delivery'::text, 
  'interview_scheduling'::text, 
  'replacement'::text,
  'application_response_time'::text
]));
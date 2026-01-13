-- Add host_settings field to meetings table
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS host_settings JSONB DEFAULT jsonb_build_object(
  'allowScreenShare', true,
  'allowReactions', true,
  'allowMicControl', true,
  'allowVideoControl', true,
  'allowChat', true,
  'accessType', 'open',
  'requireHostApproval', false,
  'allowAddActivities', true,
  'allowThirdPartyAudio', true
);
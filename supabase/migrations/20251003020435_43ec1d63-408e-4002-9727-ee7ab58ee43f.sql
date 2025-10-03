-- Add privacy_settings column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "share_full_name": true,
  "share_email": true,
  "share_phone": true,
  "share_location": true,
  "share_current_title": true,
  "share_linkedin_url": true,
  "share_career_preferences": true,
  "share_resume": true,
  "share_salary_expectations": true,
  "share_notice_period": true
}'::jsonb;
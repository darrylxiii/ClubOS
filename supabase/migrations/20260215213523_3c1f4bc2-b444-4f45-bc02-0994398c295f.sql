-- Add unique index on profile_skills(user_id, skill_name) for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_skills_user_skill
ON public.profile_skills (user_id, skill_name);
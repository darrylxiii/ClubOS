-- Drop the redundant freelance_profiles table
DROP TABLE IF EXISTS freelance_profiles CASCADE;

-- Extend profiles table with freelance-specific fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS open_to_freelance_work BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS freelance_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS freelance_availability_status TEXT DEFAULT 'not_accepting' CHECK (freelance_availability_status IN ('available', 'busy', 'not_accepting')),
ADD COLUMN IF NOT EXISTS freelance_years_experience INTEGER,
ADD COLUMN IF NOT EXISTS freelance_preferred_engagement_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS freelance_preferred_project_duration TEXT[] DEFAULT '{}';

-- Add indexes for freelance filtering
CREATE INDEX IF NOT EXISTS idx_profiles_freelance_work ON profiles(open_to_freelance_work) WHERE open_to_freelance_work = true;
CREATE INDEX IF NOT EXISTS idx_profiles_freelance_status ON profiles(freelance_availability_status);
CREATE INDEX IF NOT EXISTS idx_profiles_freelance_categories ON profiles USING GIN(freelance_categories);

-- Update existing match calculation to include profiles for freelance matching
-- This reuses the existing calculate_enhanced_match function but now works with profiles directly
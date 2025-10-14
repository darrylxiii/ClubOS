-- Add fields for course customization
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS course_image_url TEXT,
ADD COLUMN IF NOT EXISTS course_video_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
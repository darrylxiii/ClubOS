-- Add new columns to courses table for featured/trending functionality
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trending_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS enrolled_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS featured_until DATE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_featured ON courses(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_courses_trending ON courses(trending_score DESC);

-- Create materialized view for popular courses
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_courses AS
SELECT 
  c.*,
  COUNT(DISTINCT lp.user_id) as total_enrollments
FROM courses c
LEFT JOIN modules m ON m.course_id = c.id
LEFT JOIN learner_progress lp ON lp.module_id = m.id
GROUP BY c.id;

CREATE INDEX IF NOT EXISTS idx_popular_courses_enrollments ON popular_courses(total_enrollments DESC);

-- Create function to update course statistics
CREATE OR REPLACE FUNCTION update_course_stats() RETURNS TRIGGER AS $$
DECLARE
  course_uuid UUID;
BEGIN
  SELECT course_id INTO course_uuid FROM modules WHERE id = NEW.module_id;
  
  IF course_uuid IS NOT NULL THEN
    UPDATE courses
    SET enrolled_count = (
      SELECT COUNT(DISTINCT user_id) 
      FROM learner_progress lp 
      JOIN modules m ON m.id = lp.module_id 
      WHERE m.course_id = course_uuid
    )
    WHERE id = course_uuid;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update stats on new enrollments
DROP TRIGGER IF EXISTS update_stats_on_enrollment ON learner_progress;
CREATE TRIGGER update_stats_on_enrollment
  AFTER INSERT ON learner_progress
  FOR EACH ROW EXECUTE FUNCTION update_course_stats();

-- Create table for skills demand metrics
CREATE TABLE IF NOT EXISTS skills_demand_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL UNIQUE,
  job_count INTEGER DEFAULT 0,
  course_count INTEGER DEFAULT 0,
  demand_trend NUMERIC DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skills_demand_job_count ON skills_demand_metrics(job_count DESC);
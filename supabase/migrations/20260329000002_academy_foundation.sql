-- Academy Foundation Migration
-- Creates missing tables referenced by Academy components (certificates, course_reviews,
-- module_notes, module_quizzes, quiz_questions, quiz_attempts, user_badges, course_share_links)
-- Adds visibility + rating columns to courses table
-- Adds triggers for auto-updating course ratings and enrollment counts

-- ============================================================
-- 1. MISSING TABLES
-- ============================================================

-- certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE DEFAULT 'CERT-' || substr(gen_random_uuid()::text, 1, 8),
  verification_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  certificate_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- course_reviews
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  would_recommend BOOLEAN DEFAULT true,
  is_verified_completion BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- module_notes
CREATE TABLE IF NOT EXISTS public.module_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  video_timestamp_seconds INTEGER,
  is_bookmark BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, user_id)
);

-- module_quizzes
CREATE TABLE IF NOT EXISTS public.module_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER NOT NULL DEFAULT 70,
  max_attempts INTEGER,
  time_limit_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- quiz_questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.module_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT,
  explanation TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- quiz_attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.module_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB DEFAULT '{}',
  time_taken_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- user_badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.learning_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- course_share_links
CREATE TABLE IF NOT EXISTS public.course_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. ADD COLUMNS TO COURSES
-- ============================================================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private'
  CHECK (visibility IN ('private', 'unlisted', 'public'));
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_share_links ENABLE ROW LEVEL SECURITY;

-- Certificates
CREATE POLICY "Users can read own certificates" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert certificates" ON public.certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Course reviews
CREATE POLICY "Anyone authenticated can read reviews" ON public.course_reviews
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own reviews" ON public.course_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.course_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Module notes
CREATE POLICY "Users can manage own notes" ON public.module_notes
  FOR ALL USING (auth.uid() = user_id);

-- Quizzes (read for authenticated, write for course owners)
CREATE POLICY "Authenticated users can read quizzes" ON public.module_quizzes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read questions" ON public.quiz_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own quiz attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own quiz attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- User badges
CREATE POLICY "Users can read own badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert user badges" ON public.user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Course share links
CREATE POLICY "Creators can manage own share links" ON public.course_share_links
  FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Anyone can read active share links" ON public.course_share_links
  FOR SELECT USING (is_active = true);

-- Public read access for certificates verification
CREATE POLICY "Anyone can verify certificates" ON public.certificates
  FOR SELECT USING (true);

-- Public read access for course reviews (for public course pages)
CREATE POLICY "Anyone can read reviews publicly" ON public.course_reviews
  FOR SELECT USING (true);

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

-- Auto-update course rating when reviews change
CREATE OR REPLACE FUNCTION public.update_course_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.courses SET
    rating_average = COALESCE(
      (SELECT AVG(rating)::NUMERIC(3,2) FROM public.course_reviews
       WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)),
      0
    ),
    rating_count = (
      SELECT COUNT(*) FROM public.course_reviews
      WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    )
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS course_review_rating_trigger ON public.course_reviews;
CREATE TRIGGER course_review_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.course_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_course_rating();

-- Auto-increment enrolled_count when someone enrolls
CREATE OR REPLACE FUNCTION public.increment_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.courses
  SET enrolled_count = COALESCE(enrolled_count, 0) + 1
  WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS course_enrollment_trigger ON public.course_progress;
CREATE TRIGGER course_enrollment_trigger
  AFTER INSERT ON public.course_progress
  FOR EACH ROW EXECUTE FUNCTION public.increment_enrolled_count();

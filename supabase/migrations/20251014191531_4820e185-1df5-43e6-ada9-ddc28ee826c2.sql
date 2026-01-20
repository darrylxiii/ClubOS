-- Club Academy: Core Learning Platform Schema

-- 1. Academies (top-level learning organizations)
CREATE TABLE public.academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  tagline TEXT,
  cover_image_url TEXT,
  icon TEXT DEFAULT 'GraduationCap',
  is_active BOOLEAN DEFAULT true,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Learning Paths (themed collections within an academy)
CREATE TABLE public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  estimated_hours INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(academy_id, slug)
);

-- 3. Courses (comprehensive learning units)
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id UUID REFERENCES public.learning_paths(id) ON DELETE SET NULL,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  learning_objectives JSONB DEFAULT '[]',
  prerequisites JSONB DEFAULT '[]',
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  estimated_hours INTEGER,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE(academy_id, slug)
);

-- 4. Modules (granular skill-based lessons)
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  module_type TEXT DEFAULT 'lesson' CHECK (module_type IN ('lesson', 'quiz', 'assignment', 'project', 'discussion')),
  estimated_minutes INTEGER,
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE(course_id, slug)
);

-- 5. Module Content Blocks (multimedia content)
CREATE TABLE public.module_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'video', 'audio', 'code', 'quiz', 'interactive', 'resource_link', 'expert_insight')),
  content JSONB NOT NULL,
  display_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Expert Profiles (extended profiles for content creators)
CREATE TABLE public.expert_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  expertise_areas JSONB DEFAULT '[]',
  bio TEXT,
  credentials JSONB DEFAULT '[]',
  social_links JSONB DEFAULT '{}',
  badge_level TEXT DEFAULT 'contributor' CHECK (badge_level IN ('contributor', 'certified', 'master', 'distinguished')),
  total_modules INTEGER DEFAULT 0,
  total_learners INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2),
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Module Experts (co-ownership and collaboration)
CREATE TABLE public.module_experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'contributor' CHECK (role IN ('owner', 'co-author', 'contributor', 'reviewer')),
  contribution_notes TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, expert_id)
);

-- 8. Content Licensing & Compliance
CREATE TABLE public.content_licensing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  license_type TEXT NOT NULL CHECK (license_type IN ('proprietary', 'cc_by', 'cc_by_sa', 'cc_by_nc', 'cc0', 'mit', 'apache', 'gpl')),
  attribution_text TEXT,
  source_url TEXT,
  usage_rights JSONB DEFAULT '{}',
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'approved', 'flagged', 'expired')),
  last_review_date TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (module_id IS NOT NULL OR course_id IS NOT NULL)
);

-- 9. Learner Progress Tracking
CREATE TABLE public.learner_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'mastered')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  time_spent_minutes INTEGER DEFAULT 0,
  quiz_score NUMERIC(5,2),
  mastery_score NUMERIC(5,2),
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- 10. Course Progress (aggregate)
CREATE TABLE public.course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  modules_completed INTEGER DEFAULT 0,
  total_modules INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- 11. Module Questions & Answers
CREATE TABLE public.module_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  is_answered BOOLEAN DEFAULT false,
  is_flagged_for_expert BOOLEAN DEFAULT false,
  answered_by_type TEXT CHECK (answered_by_type IN ('ai', 'expert', 'community')),
  answered_by_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ,
  upvotes INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Question Answers
CREATE TABLE public.question_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.module_questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answer_text TEXT NOT NULL,
  answer_type TEXT DEFAULT 'community' CHECK (answer_type IN ('ai', 'expert', 'community')),
  is_accepted BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Module Resources
CREATE TABLE public.module_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'video', 'link', 'code_sample', 'cheat_sheet', 'flashcard_deck')),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  file_path TEXT,
  metadata JSONB DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Learning Path Enrollments
CREATE TABLE public.path_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, learning_path_id)
);

-- Indexes for performance
CREATE INDEX idx_courses_academy ON public.courses(academy_id);
CREATE INDEX idx_courses_path ON public.courses(learning_path_id);
CREATE INDEX idx_modules_course ON public.modules(course_id);
CREATE INDEX idx_module_content_module ON public.module_content(module_id);
CREATE INDEX idx_learner_progress_user ON public.learner_progress(user_id);
CREATE INDEX idx_learner_progress_module ON public.learner_progress(module_id);
CREATE INDEX idx_course_progress_user ON public.course_progress(user_id);
CREATE INDEX idx_module_questions_module ON public.module_questions(module_id);
CREATE INDEX idx_expert_profiles_user ON public.expert_profiles(user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_academies_updated_at BEFORE UPDATE ON public.academies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Academies: Public read, admin/expert write
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active academies"
  ON public.academies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage academies"
  ON public.academies FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Learning Paths: Public read, admin/expert write
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active paths"
  ON public.learning_paths FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins and experts can manage paths"
  ON public.learning_paths FOR ALL
  USING (has_role(auth.uid(), 'admin') OR 
         EXISTS (SELECT 1 FROM public.expert_profiles WHERE user_id = auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin') OR 
              EXISTS (SELECT 1 FROM public.expert_profiles WHERE user_id = auth.uid()));

-- Courses: Public read published, experts write own
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT
  USING (is_published = true);

CREATE POLICY "Creators can view their own courses"
  ON public.courses FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Experts can create courses"
  ON public.courses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Creators and admins can update courses"
  ON public.courses FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete courses"
  ON public.courses FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Modules: Public read published, experts write
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published modules"
  ON public.modules FOR SELECT
  USING (is_published = true);

CREATE POLICY "Creators can view their modules"
  ON public.modules FOR SELECT
  USING (created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.module_experts me 
                 JOIN public.expert_profiles ep ON me.expert_id = ep.id
                 WHERE me.module_id = modules.id AND ep.user_id = auth.uid()));

CREATE POLICY "Experts can create modules"
  ON public.modules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Module experts can update"
  ON public.modules FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin') OR
         EXISTS (SELECT 1 FROM public.module_experts me 
                 JOIN public.expert_profiles ep ON me.expert_id = ep.id
                 WHERE me.module_id = modules.id AND ep.user_id = auth.uid()));

-- Module Content
ALTER TABLE public.module_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published module content"
  ON public.module_content FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.modules WHERE id = module_content.module_id AND is_published = true));

CREATE POLICY "Module experts can manage content"
  ON public.module_content FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = module_content.module_id 
    AND (m.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = module_content.module_id 
    AND (m.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- Expert Profiles
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified experts"
  ON public.expert_profiles FOR SELECT
  USING (is_verified = true);

CREATE POLICY "Users can view their own profile"
  ON public.expert_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their expert profile"
  ON public.expert_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their profile"
  ON public.expert_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Learner Progress
ALTER TABLE public.learner_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress"
  ON public.learner_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Experts can view learner progress for their modules"
  ON public.learner_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = learner_progress.module_id 
    AND (m.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.module_experts me 
                 JOIN public.expert_profiles ep ON me.expert_id = ep.id
                 WHERE me.module_id = m.id AND ep.user_id = auth.uid()))
  ));

-- Course Progress
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their course progress"
  ON public.course_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Questions
ALTER TABLE public.module_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public questions"
  ON public.module_questions FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can view their own questions"
  ON public.module_questions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create questions"
  ON public.module_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their questions"
  ON public.module_questions FOR UPDATE
  USING (user_id = auth.uid());

-- Question Answers
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view answers to public questions"
  ON public.question_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.module_questions mq
    WHERE mq.id = question_answers.question_id AND mq.visibility = 'public'
  ));

CREATE POLICY "Authenticated users can create answers"
  ON public.question_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Module Resources
ALTER TABLE public.module_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view resources for published modules"
  ON public.module_resources FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = module_resources.module_id AND m.is_published = true
  ));

CREATE POLICY "Module creators can manage resources"
  ON public.module_resources FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = module_resources.module_id 
    AND (m.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = module_resources.module_id 
    AND (m.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- Content Licensing
ALTER TABLE public.content_licensing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all licensing"
  ON public.content_licensing FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Experts can view licensing for their content"
  ON public.content_licensing FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = content_licensing.module_id AND m.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = content_licensing.course_id AND c.created_by = auth.uid()
  ));

CREATE POLICY "Experts can manage licensing"
  ON public.content_licensing FOR ALL
  USING (has_role(auth.uid(), 'admin') OR 
         EXISTS (SELECT 1 FROM public.expert_profiles WHERE user_id = auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin') OR 
              EXISTS (SELECT 1 FROM public.expert_profiles WHERE user_id = auth.uid()));

-- Path Enrollments
ALTER TABLE public.path_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their enrollments"
  ON public.path_enrollments FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insert The Quantum Club Academy
INSERT INTO public.academies (name, slug, description, tagline, icon, is_active, visibility)
VALUES (
  'The Quantum Club Academy',
  'quantum-club-academy',
  'Premium learning platform for career acceleration, skill mastery, and professional excellence. Learn from industry experts, collaborate with peers, and unlock your potential.',
  'Accelerate Your Career. Master Your Craft.',
  'GraduationCap',
  true,
  'public'
);
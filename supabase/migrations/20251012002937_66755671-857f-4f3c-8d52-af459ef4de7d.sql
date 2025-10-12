-- Create enum for company achievement types
CREATE TYPE public.company_achievement_type AS ENUM ('custom', 'platform_generated');

-- Create company_achievements table
CREATE TABLE public.company_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Award',
  achievement_type company_achievement_type NOT NULL DEFAULT 'custom',
  criteria JSONB DEFAULT '{}'::jsonb,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create company_achievement_earners table
CREATE TABLE public.company_achievement_earners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id UUID NOT NULL REFERENCES public.company_achievements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  earned_company_id UUID REFERENCES public.companies(id),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT earner_check CHECK (user_id IS NOT NULL OR earned_company_id IS NOT NULL)
);

-- Create indexes
CREATE INDEX idx_company_achievements_company ON public.company_achievements(company_id);
CREATE INDEX idx_company_achievements_active ON public.company_achievements(is_active);
CREATE INDEX idx_company_achievement_earners_achievement ON public.company_achievement_earners(achievement_id);
CREATE INDEX idx_company_achievement_earners_user ON public.company_achievement_earners(user_id);
CREATE INDEX idx_company_achievement_earners_company ON public.company_achievement_earners(earned_company_id);

-- Enable RLS
ALTER TABLE public.company_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_achievement_earners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_achievements
CREATE POLICY "Anyone can view active company achievements"
ON public.company_achievements FOR SELECT
USING (is_active = true);

CREATE POLICY "Company members can create achievements"
ON public.company_achievements FOR INSERT
WITH CHECK (
  is_company_member(auth.uid(), company_id) AND
  -- Limit to 3 custom achievements per company
  (SELECT COUNT(*) FROM public.company_achievements 
   WHERE company_id = company_achievements.company_id 
   AND achievement_type = 'custom' 
   AND is_active = true) < 3
);

CREATE POLICY "Company members can update their achievements"
ON public.company_achievements FOR UPDATE
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can delete their achievements"
ON public.company_achievements FOR DELETE
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can manage all achievements"
ON public.company_achievements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for company_achievement_earners
CREATE POLICY "Anyone can view achievement earners"
ON public.company_achievement_earners FOR SELECT
USING (true);

CREATE POLICY "Company members can grant achievements"
ON public.company_achievement_earners FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_achievements ca
    WHERE ca.id = achievement_id
    AND is_company_member(auth.uid(), ca.company_id)
  )
);

CREATE POLICY "Admins can manage all earners"
ON public.company_achievement_earners FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_company_achievements_updated_at
BEFORE UPDATE ON public.company_achievements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint to limit custom achievements per company
CREATE OR REPLACE FUNCTION check_company_achievement_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.achievement_type = 'custom' THEN
    IF (SELECT COUNT(*) FROM public.company_achievements 
        WHERE company_id = NEW.company_id 
        AND achievement_type = 'custom' 
        AND is_active = true 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 3 THEN
      RAISE EXCEPTION 'Company can have maximum 3 custom achievements';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_company_achievement_limit
BEFORE INSERT OR UPDATE ON public.company_achievements
FOR EACH ROW EXECUTE FUNCTION check_company_achievement_limit();
-- Create target_companies table for partner headhunting targets
CREATE TABLE public.target_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  industry TEXT,
  priority INTEGER CHECK (priority >= 1 AND priority <= 10),
  job_specifications JSONB DEFAULT '[]'::jsonb,
  votes INTEGER DEFAULT 0,
  company_insider TEXT,
  location TEXT,
  logo_url TEXT,
  website_url TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create target_company_votes table for upvoting
CREATE TABLE public.target_company_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_company_id UUID NOT NULL REFERENCES public.target_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(target_company_id, user_id)
);

-- Create target_company_comments table
CREATE TABLE public.target_company_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_company_id UUID NOT NULL REFERENCES public.target_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.target_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_company_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_company_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for target_companies
CREATE POLICY "Company members can view target companies"
ON public.target_companies FOR SELECT
USING (is_company_member(auth.uid(), company_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Company members can create target companies"
ON public.target_companies FOR INSERT
WITH CHECK (is_company_member(auth.uid(), company_id) AND created_by = auth.uid());

CREATE POLICY "Company members can update target companies"
ON public.target_companies FOR UPDATE
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company owners can delete target companies"
ON public.target_companies FOR DELETE
USING (has_company_role(auth.uid(), company_id, 'owner'::text) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for votes
CREATE POLICY "Company members can view votes"
ON public.target_company_votes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.target_companies tc
  WHERE tc.id = target_company_votes.target_company_id
  AND is_company_member(auth.uid(), tc.company_id)
));

CREATE POLICY "Company members can vote"
ON public.target_company_votes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.target_companies tc
    WHERE tc.id = target_company_id
    AND is_company_member(auth.uid(), tc.company_id)
  ) AND user_id = auth.uid()
);

CREATE POLICY "Users can remove their votes"
ON public.target_company_votes FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for comments
CREATE POLICY "Company members can view comments"
ON public.target_company_comments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.target_companies tc
  WHERE tc.id = target_company_comments.target_company_id
  AND is_company_member(auth.uid(), tc.company_id)
));

CREATE POLICY "Company members can create comments"
ON public.target_company_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.target_companies tc
    WHERE tc.id = target_company_id
    AND is_company_member(auth.uid(), tc.company_id)
  ) AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own comments"
ON public.target_company_comments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.target_company_comments FOR DELETE
USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_target_companies_updated_at
BEFORE UPDATE ON public.target_companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_target_company_comments_updated_at
BEFORE UPDATE ON public.target_company_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_target_companies_company_id ON public.target_companies(company_id);
CREATE INDEX idx_target_companies_status ON public.target_companies(status);
CREATE INDEX idx_target_companies_priority ON public.target_companies(priority DESC);
CREATE INDEX idx_target_company_votes_target_company_id ON public.target_company_votes(target_company_id);
CREATE INDEX idx_target_company_comments_target_company_id ON public.target_company_comments(target_company_id);
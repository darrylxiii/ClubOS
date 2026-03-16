
CREATE TABLE public.company_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  city text,
  country text,
  country_code text,
  latitude double precision,
  longitude double precision,
  formatted_address text,
  is_headquarters boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.company_offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view offices"
  ON public.company_offices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Company members can insert offices"
  ON public.company_offices FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = company_offices.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.is_active = true
        AND company_members.role IN ('owner', 'admin', 'recruiter')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Company members can update offices"
  ON public.company_offices FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = company_offices.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.is_active = true
        AND company_members.role IN ('owner', 'admin', 'recruiter')
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = company_offices.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.is_active = true
        AND company_members.role IN ('owner', 'admin', 'recruiter')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Company members can delete offices"
  ON public.company_offices FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = company_offices.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.is_active = true
        AND company_members.role IN ('owner', 'admin', 'recruiter')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

INSERT INTO public.company_offices (company_id, label, city, country_code, latitude, longitude, formatted_address, is_headquarters)
SELECT id, 'Headquarters', headquarters_city, headquarters_country_code,
       headquarters_latitude, headquarters_longitude, headquarters_location, true
FROM public.companies
WHERE headquarters_city IS NOT NULL OR headquarters_latitude IS NOT NULL;

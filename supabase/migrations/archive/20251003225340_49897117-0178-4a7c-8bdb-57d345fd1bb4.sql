-- Create contact roles table
CREATE TABLE public.contact_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_custom boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Insert default roles
INSERT INTO public.contact_roles (name, is_custom) VALUES
  ('Hiring Manager', false),
  ('Recruiter', false),
  ('Team Lead', false),
  ('HR Manager', false),
  ('Department Head', false),
  ('C-Level Executive', false);

-- Create target company contacts table
CREATE TABLE public.target_company_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_company_id uuid REFERENCES public.target_companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  role_id uuid REFERENCES public.contact_roles(id),
  custom_role text,
  email text,
  phone text,
  linkedin_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_company_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_roles
CREATE POLICY "Anyone can view roles"
  ON public.contact_roles FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON public.contact_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for target_company_contacts
CREATE POLICY "Company members can view contacts"
  ON public.target_company_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.target_companies tc
      WHERE tc.id = target_company_contacts.target_company_id
      AND is_company_member(auth.uid(), tc.company_id)
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Company members can create contacts"
  ON public.target_company_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.target_companies tc
      WHERE tc.id = target_company_contacts.target_company_id
      AND is_company_member(auth.uid(), tc.company_id)
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Company members can update contacts"
  ON public.target_company_contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.target_companies tc
      WHERE tc.id = target_company_contacts.target_company_id
      AND is_company_member(auth.uid(), tc.company_id)
    )
  );

CREATE POLICY "Company members can delete contacts"
  ON public.target_company_contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.target_companies tc
      WHERE tc.id = target_company_contacts.target_company_id
      AND is_company_member(auth.uid(), tc.company_id)
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_target_company_contacts_updated_at
  BEFORE UPDATE ON public.target_company_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
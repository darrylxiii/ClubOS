-- Phase 1: Create project_contracts table and update tracking_projects

-- Create project_contracts table for Club Projects freelance marketplace
CREATE TABLE IF NOT EXISTS public.project_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_title TEXT NOT NULL,
  project_description TEXT,
  freelancer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_hours_budget NUMERIC(10,2),
  estimated_total NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'completed', 'cancelled')),
  contract_terms TEXT,
  start_date DATE,
  end_date DATE,
  payment_terms TEXT DEFAULT 'upon_completion',
  escrow_amount NUMERIC(10,2) DEFAULT 0,
  platform_fee_percentage NUMERIC(5,2) DEFAULT 15.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_contracts_freelancer_id ON public.project_contracts(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_project_contracts_client_id ON public.project_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_project_contracts_company_id ON public.project_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_project_contracts_status ON public.project_contracts(status);

-- Enable RLS
ALTER TABLE public.project_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_contracts
CREATE POLICY "Freelancers can view their contracts"
  ON public.project_contracts
  FOR SELECT
  USING (auth.uid() = freelancer_id);

CREATE POLICY "Clients can view their contracts"
  ON public.project_contracts
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Company members can view company contracts"
  ON public.project_contracts
  FOR SELECT
  USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create contracts"
  ON public.project_contracts
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Contract parties can update"
  ON public.project_contracts
  FOR UPDATE
  USING (auth.uid() IN (freelancer_id, client_id));

-- Add company_id to tracking_projects if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_projects' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.tracking_projects ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
    CREATE INDEX idx_tracking_projects_company_id ON public.tracking_projects(company_id);
  END IF;
END $$;

-- Add contract_id to tracking_projects if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_projects' AND column_name = 'contract_id'
  ) THEN
    ALTER TABLE public.tracking_projects ADD COLUMN contract_id UUID REFERENCES public.project_contracts(id) ON DELETE SET NULL;
    CREATE INDEX idx_tracking_projects_contract_id ON public.tracking_projects(contract_id);
  END IF;
END $$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_project_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_project_contracts_updated_at ON public.project_contracts;
CREATE TRIGGER update_project_contracts_updated_at
  BEFORE UPDATE ON public.project_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_project_contracts_updated_at();
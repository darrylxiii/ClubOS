-- =====================================================
-- Partner Contract Management System
-- =====================================================

-- 1. Contract deadline alerts for SLA tracking
CREATE TABLE IF NOT EXISTS public.contract_deadline_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('approaching', 'breached', 'cleared')),
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Contract invoices for financial tracking
CREATE TABLE IF NOT EXISTS public.contract_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  milestone_ids UUID[] DEFAULT '{}',
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  moneybird_invoice_id TEXT,
  pdf_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Contract change orders for governance
CREATE TABLE IF NOT EXISTS public.contract_change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  scope_change TEXT,
  budget_impact NUMERIC DEFAULT 0,
  timeline_impact_days INTEGER DEFAULT 0,
  justification TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Contract approval rules for multi-approver workflows
CREATE TABLE IF NOT EXISTS public.contract_approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  threshold_amount NUMERIC,
  required_approvers UUID[] DEFAULT '{}',
  approval_type TEXT DEFAULT 'any' CHECK (approval_type IN ('any', 'all', 'sequential')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Contract approval requests
CREATE TABLE IF NOT EXISTS public.contract_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.contract_approval_rules(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('contract_approval', 'milestone_release', 'change_order', 'invoice_approval')),
  approvers_required UUID[] DEFAULT '{}',
  approvers_completed UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 6. Add category column to contract_templates if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contract_templates' AND column_name = 'category') THEN
    ALTER TABLE public.contract_templates ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
END $$;

-- 7. Add version tracking columns to project_contracts if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'project_contracts' AND column_name = 'version') THEN
    ALTER TABLE public.project_contracts ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'project_contracts' AND column_name = 'parent_contract_id') THEN
    ALTER TABLE public.project_contracts ADD COLUMN parent_contract_id UUID REFERENCES public.project_contracts(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'project_contracts' AND column_name = 'wizard_draft_data') THEN
    ALTER TABLE public.project_contracts ADD COLUMN wizard_draft_data JSONB;
  END IF;
END $$;

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Contract Deadline Alerts
ALTER TABLE public.contract_deadline_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts for their contracts" ON public.contract_deadline_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can acknowledge their contract alerts" ON public.contract_deadline_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

-- Contract Invoices
ALTER TABLE public.contract_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices for their contracts" ON public.contract_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

CREATE POLICY "Contract owners can create invoices" ON public.contract_invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

CREATE POLICY "Contract owners can update invoices" ON public.contract_invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

-- Contract Change Orders
ALTER TABLE public.contract_change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view change orders for their contracts" ON public.contract_change_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can create change orders for their contracts" ON public.contract_change_orders
  FOR INSERT WITH CHECK (
    requested_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

CREATE POLICY "Contract owners can update change orders" ON public.contract_change_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

-- Contract Approval Rules
ALTER TABLE public.contract_approval_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view approval rules" ON public.contract_approval_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = company_id
    )
  );

CREATE POLICY "Company admins can manage approval rules" ON public.contract_approval_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid() 
      AND p.company_id = company_id
      AND ur.role IN ('admin', 'partner')
    )
  );

-- Contract Approval Requests
ALTER TABLE public.contract_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval requests for their contracts" ON public.contract_approval_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    ) OR auth.uid() = ANY(approvers_required)
  );

CREATE POLICY "Approvers can update approval requests" ON public.contract_approval_requests
  FOR UPDATE USING (
    auth.uid() = ANY(approvers_required)
  );

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_contract_deadline_alerts_contract ON public.contract_deadline_alerts(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_deadline_alerts_milestone ON public.contract_deadline_alerts(milestone_id);
CREATE INDEX IF NOT EXISTS idx_contract_invoices_contract ON public.contract_invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_invoices_status ON public.contract_invoices(status);
CREATE INDEX IF NOT EXISTS idx_contract_change_orders_contract ON public.contract_change_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_change_orders_status ON public.contract_change_orders(status);
CREATE INDEX IF NOT EXISTS idx_contract_approval_rules_company ON public.contract_approval_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_approval_requests_contract ON public.contract_approval_requests(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_approval_requests_status ON public.contract_approval_requests(status);

-- =====================================================
-- Enable Realtime for key tables
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_deadline_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_change_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_approval_requests;
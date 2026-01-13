-- Fraud detection signals
CREATE TABLE IF NOT EXISTS public.marketplace_fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('rapid_proposals', 'duplicate_content', 'fake_reviews', 'suspicious_login', 'chargebacks')),
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB DEFAULT '{}',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contract Templates for NDAs and agreements
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('nda', 'service_agreement', 'sow', 'ip_assignment', 'custom')),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Signed documents tracking
CREATE TABLE IF NOT EXISTS public.signed_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES project_contracts(id) ON DELETE CASCADE,
  template_id UUID REFERENCES contract_templates(id),
  signer_id UUID NOT NULL,
  signer_name TEXT,
  signature_data TEXT,
  signed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add escrow fields to milestones if not exist
ALTER TABLE public.project_milestones 
ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN ('pending', 'funded', 'released', 'disputed', 'refunded')),
ADD COLUMN IF NOT EXISTS escrow_funded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_release_date DATE;

-- Enable RLS
ALTER TABLE public.marketplace_fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view fraud signals" ON public.marketplace_fraud_signals
  FOR SELECT USING (true); -- Will be restricted by admin check in app

CREATE POLICY "System can insert fraud signals" ON public.marketplace_fraud_signals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view active templates" ON public.contract_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Creators can manage their templates" ON public.contract_templates
  FOR ALL USING (auth.uid() = created_by OR is_system = true);

CREATE POLICY "Signers can view their signed docs" ON public.signed_documents
  FOR SELECT USING (auth.uid() = signer_id);

CREATE POLICY "Users can sign documents" ON public.signed_documents
  FOR INSERT WITH CHECK (auth.uid() = signer_id);

-- Insert system NDA template
INSERT INTO public.contract_templates (name, template_type, content, variables, is_system, is_active)
VALUES (
  'Standard NDA',
  'nda',
  'MUTUAL NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} between:

Party A: {{party_a_name}}
Party B: {{party_b_name}}

1. CONFIDENTIAL INFORMATION
Both parties agree to hold in strict confidence any proprietary or confidential information disclosed during the course of the project.

2. OBLIGATIONS
Each party agrees to:
- Use the Confidential Information solely for the purpose of the project
- Not disclose the Confidential Information to any third party
- Take reasonable measures to protect the confidentiality

3. TERM
This Agreement shall remain in effect for a period of {{term_years}} years from the date of signing.

4. GOVERNING LAW
This Agreement shall be governed by the laws of {{jurisdiction}}.

SIGNATURES:
Party A: _________________________ Date: _________
Party B: _________________________ Date: _________',
  '[{"name": "effective_date", "type": "date"}, {"name": "party_a_name", "type": "text"}, {"name": "party_b_name", "type": "text"}, {"name": "term_years", "type": "number", "default": "2"}, {"name": "jurisdiction", "type": "text", "default": "The Netherlands"}]',
  true,
  true
);
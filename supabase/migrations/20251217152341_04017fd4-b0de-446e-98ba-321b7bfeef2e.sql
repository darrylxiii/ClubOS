-- Phase 1: Admin-Only Critical Features Database Schema

-- Add is_active column to companies table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'companies' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Create bulk_operation_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.bulk_operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN ('email', 'assessment', 'scheduling', 'export', 'invitation', 'pipeline_invite')),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  target_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  metadata jsonb DEFAULT '{}',
  target_ids uuid[] DEFAULT '{}',
  error_details jsonb DEFAULT '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contract_documents table
CREATE TABLE IF NOT EXISTS public.contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  contract_type text NOT NULL CHECK (contract_type IN ('freelance', 'project', 'employment')),
  document_type text NOT NULL CHECK (document_type IN ('nda', 'sow', 'contract', 'amendment', 'other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_kb integer,
  mime_type text,
  version integer DEFAULT 1,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bulk_operation_logs_admin ON public.bulk_operation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_logs_type ON public.bulk_operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_logs_status ON public.bulk_operation_logs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_logs_created ON public.bulk_operation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_documents_contract ON public.contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_type ON public.contract_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_contract_documents_uploaded_by ON public.contract_documents(uploaded_by);

-- Enable RLS
ALTER TABLE public.bulk_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bulk_operation_logs (admin only)
CREATE POLICY "bulk_operation_logs_admin_all" ON public.bulk_operation_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for contract_documents
-- Admins can see all
CREATE POLICY "contract_documents_admin_all" ON public.contract_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Users can see documents for their own contracts
CREATE POLICY "contract_documents_owner_select" ON public.contract_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.freelance_contracts fc
      WHERE fc.id = contract_documents.contract_id
      AND (fc.freelancer_id = auth.uid() OR fc.client_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_documents.contract_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

-- Users can upload documents to their own contracts
CREATE POLICY "contract_documents_owner_insert" ON public.contract_documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.freelance_contracts fc
        WHERE fc.id = contract_documents.contract_id
        AND (fc.freelancer_id = auth.uid() OR fc.client_id = auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM public.project_contracts pc
        WHERE pc.id = contract_documents.contract_id
        AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
      )
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_bulk_operation_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_contract_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_bulk_operation_logs_updated_at ON public.bulk_operation_logs;
CREATE TRIGGER update_bulk_operation_logs_updated_at
  BEFORE UPDATE ON public.bulk_operation_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_bulk_operation_logs_updated_at();

DROP TRIGGER IF EXISTS update_contract_documents_updated_at ON public.contract_documents;
CREATE TRIGGER update_contract_documents_updated_at
  BEFORE UPDATE ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_contract_documents_updated_at();

-- Enable Realtime for bulk operations status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_operation_logs;
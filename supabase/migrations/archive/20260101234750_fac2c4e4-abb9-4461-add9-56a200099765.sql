-- Add archive support columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Add index for efficient filtering of archived companies
CREATE INDEX IF NOT EXISTS idx_companies_archived ON public.companies(archived_at) WHERE archived_at IS NOT NULL;

-- Add index for is_active filtering
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON public.companies(is_active);

-- Comment on columns
COMMENT ON COLUMN public.companies.archived_at IS 'Timestamp when the company was archived (soft delete)';
COMMENT ON COLUMN public.companies.archived_by IS 'User who archived the company';
COMMENT ON COLUMN public.companies.archive_reason IS 'Reason for archiving the company';
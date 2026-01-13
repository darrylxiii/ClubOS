-- Phase 8: Add cash flow tracking to placement_fees
ALTER TABLE placement_fees 
ADD COLUMN IF NOT EXISTS cash_flow_status TEXT DEFAULT 'pending';

ALTER TABLE placement_fees 
ADD COLUMN IF NOT EXISTS expected_collection_date DATE;

-- Add check constraint separately to avoid issues if column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'placement_fees_cash_flow_status_check'
  ) THEN
    ALTER TABLE placement_fees 
    ADD CONSTRAINT placement_fees_cash_flow_status_check 
    CHECK (cash_flow_status IN ('pending', 'invoiced', 'partial', 'collected', 'written_off'));
  END IF;
END $$;

-- Index for cash flow queries
CREATE INDEX IF NOT EXISTS idx_placement_fees_cash_flow 
  ON placement_fees(cash_flow_status, expected_collection_date);

-- Add variance tracking columns if not exists
ALTER TABLE placement_fees 
ADD COLUMN IF NOT EXISTS variance_amount NUMERIC DEFAULT 0;

ALTER TABLE placement_fees 
ADD COLUMN IF NOT EXISTS variance_reason TEXT;

-- Create a view for cash flow pipeline analytics
CREATE OR REPLACE VIEW cash_flow_pipeline AS
SELECT 
  cash_flow_status,
  COUNT(*) as count,
  SUM(fee_amount) as total_amount,
  SUM(CASE WHEN expected_collection_date <= CURRENT_DATE THEN fee_amount ELSE 0 END) as overdue_amount,
  SUM(CASE WHEN expected_collection_date > CURRENT_DATE AND expected_collection_date <= CURRENT_DATE + 30 THEN fee_amount ELSE 0 END) as due_30_days,
  SUM(CASE WHEN expected_collection_date > CURRENT_DATE + 30 AND expected_collection_date <= CURRENT_DATE + 60 THEN fee_amount ELSE 0 END) as due_60_days,
  SUM(CASE WHEN expected_collection_date > CURRENT_DATE + 60 THEN fee_amount ELSE 0 END) as due_90_plus
FROM placement_fees
WHERE status != 'cancelled'
GROUP BY cash_flow_status;

-- Create a view for data integrity checking
CREATE OR REPLACE VIEW data_integrity_issues AS
SELECT 
  'hired_without_fee' as issue_type,
  a.id as record_id,
  a.candidate_full_name as description,
  a.updated_at as detected_at
FROM applications a
LEFT JOIN placement_fees pf ON pf.application_id = a.id
WHERE a.status = 'hired' AND pf.id IS NULL

UNION ALL

SELECT 
  'fee_without_commission' as issue_type,
  pf.id as record_id,
  CONCAT('Fee: €', pf.fee_amount::TEXT) as description,
  pf.created_at as detected_at
FROM placement_fees pf
LEFT JOIN employee_commissions ec ON ec.placement_fee_id = pf.id
WHERE ec.id IS NULL AND pf.status NOT IN ('cancelled', 'pending')

UNION ALL

SELECT 
  'orphaned_commission' as issue_type,
  ec.id as record_id,
  CONCAT('Commission: €', ec.gross_amount::TEXT) as description,
  ec.created_at as detected_at
FROM employee_commissions ec
LEFT JOIN placement_fees pf ON pf.id = ec.placement_fee_id
WHERE ec.placement_fee_id IS NOT NULL AND pf.id IS NULL;
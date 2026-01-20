-- Remove duplicate moneybird_financial_metrics, keep only the latest per period
DELETE FROM moneybird_financial_metrics a
USING moneybird_financial_metrics b
WHERE a.period_start = b.period_start 
  AND a.last_synced_at < b.last_synced_at;

-- Add unique constraint to prevent future duplicates
ALTER TABLE moneybird_financial_metrics 
ADD CONSTRAINT unique_moneybird_period_start UNIQUE (period_start);
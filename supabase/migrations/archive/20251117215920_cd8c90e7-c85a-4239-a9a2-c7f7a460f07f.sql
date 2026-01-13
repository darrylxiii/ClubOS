-- Fix onboarding_last_activity_at timestamps
UPDATE profiles
SET onboarding_last_activity_at = CASE
  -- If they never started, set to NULL
  WHEN onboarding_current_step = 0 AND onboarding_completed_at IS NULL THEN NULL
  
  -- If they completed, use completion date
  WHEN onboarding_completed_at IS NOT NULL THEN onboarding_completed_at
  
  -- If in progress, use created_at as fallback
  ELSE created_at
END
WHERE onboarding_last_activity_at = '2025-11-17 21:31:49.448968+00'; -- The bad timestamp from previous migration

-- Clean up test partner requests (decline duplicate Darryl accounts)
UPDATE profiles
SET 
  account_status = 'declined',
  account_decline_reason = 'Test account - duplicate entry',
  account_reviewed_at = NOW()
WHERE 
  email = 'darryl@thequantumclub.nl'
  AND account_status = 'pending'
  AND id != '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5'; -- Keep main account
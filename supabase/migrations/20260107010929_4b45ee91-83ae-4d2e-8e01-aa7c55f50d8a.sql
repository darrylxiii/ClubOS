
-- Fix the broken trigger that references non-existent 'referrals' table
-- Make it safely handle cases where referrals table doesn't exist

CREATE OR REPLACE FUNCTION calculate_commissions_on_placement_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_id UUID;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
BEGIN
  -- Only process if fee_amount is set and positive
  IF NEW.fee_amount IS NULL OR NEW.fee_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Skip if fee_amount hasn't changed (for updates)
  IF TG_OP = 'UPDATE' AND OLD.fee_amount = NEW.fee_amount THEN
    RETURN NEW;
  END IF;

  -- Check if referral_id column exists and has a value
  -- Since referral_id may not exist on the table, safely skip
  BEGIN
    v_referral_id := NEW.referral_id;
  EXCEPTION WHEN undefined_column THEN
    RETURN NEW;
  END;
  
  -- If no referral_id, skip commission calculation
  IF v_referral_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Try to find referral and calculate commission
  -- Use referral_ledger table instead of non-existent referrals table
  BEGIN
    SELECT COALESCE(rl.payout_percentage, 0.10)
    INTO v_commission_rate
    FROM referral_ledger rl
    WHERE rl.referral_id = v_referral_id
    LIMIT 1;
    
    IF v_commission_rate IS NOT NULL THEN
      v_commission_amount := NEW.fee_amount * v_commission_rate;
      
      -- Update referral_ledger with earnings if it exists
      UPDATE referral_ledger
      SET realized_earnings = COALESCE(realized_earnings, 0) + v_commission_amount,
          updated_at = now()
      WHERE referral_id = v_referral_id;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip silently
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

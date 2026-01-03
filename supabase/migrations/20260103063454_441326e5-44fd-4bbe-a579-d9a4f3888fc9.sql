-- Phase 4: Referral Payout Automation

CREATE OR REPLACE FUNCTION create_referral_payout_on_hire()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_earning RECORD;
  v_config RECORD;
  v_payout_amount NUMERIC;
BEGIN
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') THEN
    
    -- Get referral earnings for this application
    SELECT 
      re.*,
      p.full_name as referrer_name
    INTO v_referral_earning
    FROM referral_earnings re
    LEFT JOIN profiles p ON p.id = re.referrer_id
    WHERE re.application_id = NEW.id
      AND re.status IN ('pending', 'projected', 'qualified');
    
    IF v_referral_earning.id IS NOT NULL THEN
      -- Get referral config for default amounts
      SELECT * INTO v_config
      FROM referral_config
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1;
      
      v_payout_amount := COALESCE(v_referral_earning.amount, v_config.bonus_amount_euros, 500);
      
      -- Create referral payout (avoid duplicates)
      INSERT INTO referral_payouts (
        referrer_user_id, 
        candidate_id, 
        application_id,
        payout_amount, 
        currency_code, 
        status, 
        notes
      )
      SELECT 
        v_referral_earning.referrer_id, 
        NEW.candidate_id, 
        NEW.id,
        v_payout_amount, 
        'EUR', 
        'pending', 
        'Auto-created on hire - referral from ' || COALESCE(v_referral_earning.referrer_name, 'Unknown')
      WHERE NOT EXISTS (
        SELECT 1 FROM referral_payouts 
        WHERE application_id = NEW.id 
          AND referrer_user_id = v_referral_earning.referrer_id
      );
      
      -- Update referral earning status to realized
      UPDATE referral_earnings
      SET status = 'realized',
          payment_status = 'pending',
          updated_at = NOW()
      WHERE id = v_referral_earning.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create Referral Trigger
DROP TRIGGER IF EXISTS trg_create_referral_payout ON applications;
CREATE TRIGGER trg_create_referral_payout
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_payout_on_hire();

-- Also for INSERT with hired status
DROP TRIGGER IF EXISTS trg_create_referral_payout_insert ON applications;
CREATE TRIGGER trg_create_referral_payout_insert
  AFTER INSERT ON applications
  FOR EACH ROW
  WHEN (NEW.status = 'hired')
  EXECUTE FUNCTION create_referral_payout_on_hire();
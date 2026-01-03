-- Fix the calculate_commissions_on_placement_fee function to use correct column name
-- The placement_fees table uses 'fee_amount', not 'placement_fee'

CREATE OR REPLACE FUNCTION public.calculate_commissions_on_placement_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_tier_name TEXT;
BEGIN
  -- Only process if fee_amount is set and positive
  IF NEW.fee_amount IS NULL OR NEW.fee_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Skip if fee_amount hasn't changed (for updates)
  IF TG_OP = 'UPDATE' AND OLD.fee_amount = NEW.fee_amount THEN
    RETURN NEW;
  END IF;

  -- Find the referral associated with this placement
  SELECT r.*, rt.commission_rate, rt.name as tier_name
  INTO v_referral
  FROM referrals r
  LEFT JOIN referral_tiers rt ON r.tier_id = rt.id
  WHERE r.id = NEW.referral_id;

  -- If no referral found, skip commission calculation
  IF v_referral IS NULL THEN
    RETURN NEW;
  END IF;

  -- Use tier commission rate or default to 10%
  v_commission_rate := COALESCE(v_referral.commission_rate, 0.10);
  v_tier_name := COALESCE(v_referral.tier_name, 'Standard');

  -- Calculate commission amount
  v_commission_amount := NEW.fee_amount * v_commission_rate;

  -- Insert or update commission record
  INSERT INTO commissions (
    referral_id,
    placement_fee_id,
    amount,
    rate,
    source_type,
    status,
    notes
  ) VALUES (
    NEW.referral_id,
    NEW.id,
    v_commission_amount,
    v_commission_rate,
    'placement',
    'pending',
    'Auto-calculated from placement fee. Tier: ' || v_tier_name
  )
  ON CONFLICT (placement_fee_id) 
  DO UPDATE SET
    amount = EXCLUDED.amount,
    rate = EXCLUDED.rate,
    notes = EXCLUDED.notes,
    updated_at = now();

  RETURN NEW;
END;
$$;
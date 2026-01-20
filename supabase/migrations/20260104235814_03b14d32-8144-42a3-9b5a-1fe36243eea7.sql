
-- Fix function search_path security warnings
-- Setting search_path to 'public' to prevent search_path injection attacks

-- Fix calculate_tier_score function
CREATE OR REPLACE FUNCTION calculate_tier_score(p_candidate_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL(5,2) := 0;
  v_move_prob DECIMAL(5,2);
  v_warmth DECIMAL(5,2);
  v_last_contact TIMESTAMPTZ;
  v_profile_complete DECIMAL(5,2);
  v_response_rate DECIMAL(5,2);
  v_referrals INT;
  v_recency_score DECIMAL(5,2);
BEGIN
  SELECT 
    COALESCE(cp.move_probability, 0),
    COALESCE(cp.profile_completeness, 0)
  INTO v_move_prob, v_profile_complete
  FROM public.candidate_profiles cp
  WHERE cp.id = p_candidate_id;

  SELECT 
    COALESCE(cr.warmth_score, 0),
    cr.last_meaningful_contact,
    COALESCE(cr.response_rate, 0),
    COALESCE(cr.successful_referrals, 0)
  INTO v_warmth, v_last_contact, v_response_rate, v_referrals
  FROM public.candidate_relationships cr
  WHERE cr.candidate_id = p_candidate_id;

  IF v_last_contact IS NULL THEN
    v_recency_score := 20;
  ELSIF v_last_contact > NOW() - INTERVAL '7 days' THEN
    v_recency_score := 100;
  ELSIF v_last_contact > NOW() - INTERVAL '14 days' THEN
    v_recency_score := 80;
  ELSIF v_last_contact > NOW() - INTERVAL '30 days' THEN
    v_recency_score := 60;
  ELSIF v_last_contact > NOW() - INTERVAL '60 days' THEN
    v_recency_score := 40;
  ELSIF v_last_contact > NOW() - INTERVAL '90 days' THEN
    v_recency_score := 20;
  ELSE
    v_recency_score := 10;
  END IF;

  v_score := (
    (COALESCE(v_move_prob, 0) * 0.25) +
    (COALESCE(v_warmth, 0) * 0.25) +
    (v_recency_score * 0.20) +
    (COALESCE(v_profile_complete, 0) * 0.15) +
    (COALESCE(v_response_rate, 0) * 0.10) +
    (LEAST(v_referrals * 20, 100) * 0.05)
  );

  RETURN ROUND(v_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_candidate_tier function
CREATE OR REPLACE FUNCTION update_candidate_tier(p_candidate_id UUID, p_reason TEXT DEFAULT 'auto_calculated')
RETURNS VOID AS $$
DECLARE
  v_new_score DECIMAL(5,2);
  v_new_tier TEXT;
BEGIN
  v_new_score := public.calculate_tier_score(p_candidate_id);
  v_new_tier := public.get_tier_from_score(v_new_score);

  UPDATE public.candidate_profiles
  SET 
    tier_score = v_new_score,
    talent_tier = v_new_tier,
    tier_updated_at = NOW(),
    tier_update_reason = p_reason
  WHERE id = p_candidate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_relationship_metrics function
CREATE OR REPLACE FUNCTION update_relationship_metrics(p_candidate_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_touchpoints INT;
  v_outbound INT;
  v_responses INT;
  v_response_rate DECIMAL(5,2);
  v_last_contact TIMESTAMPTZ;
  v_warmth_score DECIMAL(5,2);
  v_strength TEXT;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE interaction_type IN ('email_sent', 'call_outbound', 'linkedin_message_sent')),
    COUNT(*) FILTER (WHERE interaction_type IN ('email_received', 'call_inbound', 'linkedin_message_received')),
    MAX(created_at)
  INTO v_total_touchpoints, v_outbound, v_responses, v_last_contact
  FROM public.candidate_interactions
  WHERE candidate_id = p_candidate_id;

  IF v_outbound > 0 THEN
    v_response_rate := ROUND((v_responses::DECIMAL / v_outbound) * 100, 2);
  ELSE
    v_response_rate := 0;
  END IF;

  v_warmth_score := LEAST(
    (v_total_touchpoints * 5) + 
    (v_response_rate * 0.5) +
    (CASE WHEN v_last_contact > NOW() - INTERVAL '30 days' THEN 30 ELSE 0 END),
    100
  );

  IF v_warmth_score >= 80 THEN
    v_strength := 'advocate';
  ELSIF v_warmth_score >= 60 THEN
    v_strength := 'strong';
  ELSIF v_warmth_score >= 40 THEN
    v_strength := 'warm';
  ELSIF v_warmth_score >= 20 THEN
    v_strength := 'warming';
  ELSE
    v_strength := 'cold';
  END IF;

  INSERT INTO public.candidate_relationships (
    candidate_id,
    total_touchpoints,
    outbound_messages,
    responses_received,
    response_rate,
    last_meaningful_contact,
    warmth_score,
    relationship_strength,
    updated_at
  )
  VALUES (
    p_candidate_id,
    v_total_touchpoints,
    v_outbound,
    v_responses,
    v_response_rate,
    v_last_contact,
    v_warmth_score,
    v_strength,
    NOW()
  )
  ON CONFLICT (candidate_id) DO UPDATE SET
    total_touchpoints = EXCLUDED.total_touchpoints,
    outbound_messages = EXCLUDED.outbound_messages,
    responses_received = EXCLUDED.responses_received,
    response_rate = EXCLUDED.response_rate,
    last_meaningful_contact = EXCLUDED.last_meaningful_contact,
    warmth_score = EXCLUDED.warmth_score,
    relationship_strength = EXCLUDED.relationship_strength,
    updated_at = NOW();

  PERFORM public.update_candidate_tier(p_candidate_id, 'relationship_updated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_list_candidate_count function
CREATE OR REPLACE FUNCTION update_list_candidate_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.talent_pool_lists 
    SET candidate_count = candidate_count + 1,
        updated_at = NOW()
    WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.talent_pool_lists 
    SET candidate_count = candidate_count - 1,
        updated_at = NOW()
    WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix update_updated_at_timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

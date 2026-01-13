
-- Fix the remaining get_tier_from_score function
CREATE OR REPLACE FUNCTION get_tier_from_score(p_score DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF p_score >= 80 THEN
    RETURN 'hot';
  ELSIF p_score >= 60 THEN
    RETURN 'warm';
  ELSIF p_score >= 40 THEN
    RETURN 'strategic';
  ELSIF p_score >= 20 THEN
    RETURN 'pool';
  ELSE
    RETURN 'dormant';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

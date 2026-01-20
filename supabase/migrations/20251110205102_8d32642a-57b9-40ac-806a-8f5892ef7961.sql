-- Fix ambiguous column reference in calculate_post_score function
-- Add table alias to avoid confusion between column and variable

CREATE OR REPLACE FUNCTION public.calculate_post_score(
  p_user_id uuid, 
  p_post_id uuid, 
  p_post_created_at timestamp with time zone, 
  p_post_author_id uuid, 
  p_likes_count integer, 
  p_comments_count integer, 
  p_shares_count integer
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recency_score NUMERIC := 0;
  relationship_score NUMERIC := 0;
  engagement_score NUMERIC := 0;
  total_score NUMERIC := 0;
  hours_old NUMERIC;
BEGIN
  -- Recency score (30% weight) - exponential decay
  hours_old := EXTRACT(EPOCH FROM (now() - p_post_created_at)) / 3600;
  recency_score := 30 * EXP(-hours_old / 24); -- Decays over 24 hours
  
  -- Relationship score (40% weight)
  -- Fixed: Added table alias 'ur' to avoid ambiguous column reference
  SELECT COALESCE(ur.relationship_score, 0) * 0.4 INTO relationship_score
  FROM public.user_relationships ur
  WHERE ur.user_id = p_user_id AND ur.related_user_id = p_post_author_id;
  
  -- Engagement score (30% weight)
  engagement_score := (p_likes_count * 1 + p_comments_count * 3 + p_shares_count * 5) * 0.3;
  
  -- Total score
  total_score := recency_score + COALESCE(relationship_score, 0) + engagement_score;
  
  RETURN total_score;
END;
$$;
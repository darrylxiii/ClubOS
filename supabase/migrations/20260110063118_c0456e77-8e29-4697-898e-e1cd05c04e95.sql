-- Create optimized RPC function to eliminate N+1 queries in team revenue leaderboard
CREATE OR REPLACE FUNCTION get_team_revenue_leaderboard(target_year INT DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  revenue NUMERIC,
  deal_count BIGINT
) 
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH user_revenue AS (
    SELECT 
      COALESCE(pf.sourced_by, pf.closed_by, pf.added_by) as uid,
      pf.id as placement_id,
      pf.fee_amount,
      pf.sourced_by,
      pf.closed_by,
      pf.added_by
    FROM placement_fees pf
    WHERE 
      (target_year IS NULL OR EXTRACT(YEAR FROM pf.hired_date) = target_year)
      AND (pf.sourced_by IS NOT NULL OR pf.closed_by IS NOT NULL OR pf.added_by IS NOT NULL)
  ),
  revenue_calc AS (
    SELECT 
      p.id as user_id,
      p.full_name,
      p.avatar_url,
      SUM(
        CASE 
          WHEN ur.sourced_by = p.id AND ur.closed_by = p.id THEN ur.fee_amount
          WHEN ur.sourced_by = p.id AND ur.closed_by IS NOT NULL AND ur.closed_by != p.id THEN ur.fee_amount * 0.5
          WHEN ur.closed_by = p.id AND ur.sourced_by IS NOT NULL AND ur.sourced_by != p.id THEN ur.fee_amount * 0.5
          WHEN ur.sourced_by = p.id THEN ur.fee_amount
          WHEN ur.closed_by = p.id THEN ur.fee_amount
          WHEN ur.added_by = p.id AND ur.sourced_by IS NULL AND ur.closed_by IS NULL THEN ur.fee_amount
          ELSE 0
        END
      ) as revenue,
      COUNT(DISTINCT ur.placement_id) as deal_count
    FROM profiles p
    INNER JOIN user_revenue ur ON (
      ur.sourced_by = p.id OR ur.closed_by = p.id OR 
      (ur.added_by = p.id AND ur.sourced_by IS NULL AND ur.closed_by IS NULL)
    )
    WHERE p.full_name IS NOT NULL
    GROUP BY p.id, p.full_name, p.avatar_url
    HAVING SUM(
      CASE 
        WHEN ur.sourced_by = p.id AND ur.closed_by = p.id THEN ur.fee_amount
        WHEN ur.sourced_by = p.id AND ur.closed_by IS NOT NULL AND ur.closed_by != p.id THEN ur.fee_amount * 0.5
        WHEN ur.closed_by = p.id AND ur.sourced_by IS NOT NULL AND ur.sourced_by != p.id THEN ur.fee_amount * 0.5
        WHEN ur.sourced_by = p.id THEN ur.fee_amount
        WHEN ur.closed_by = p.id THEN ur.fee_amount
        WHEN ur.added_by = p.id AND ur.sourced_by IS NULL AND ur.closed_by IS NULL THEN ur.fee_amount
        ELSE 0
      END
    ) > 0
  )
  SELECT user_id, full_name, avatar_url, revenue, deal_count
  FROM revenue_calc
  ORDER BY revenue DESC;
$$;
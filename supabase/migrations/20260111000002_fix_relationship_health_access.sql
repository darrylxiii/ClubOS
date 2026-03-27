-- Enable RLS on profiles to ensure we have control, but allow public read
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Safely create policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'profiles'
        AND policyname = 'Public profiles are viewable by everyone'
    ) THEN
        CREATE POLICY "Public profiles are viewable by everyone"
        ON profiles FOR SELECT
        USING ( true );
    END IF;
END
$$;

-- PROFILES: Ensure internal users have entries (Optional: idempotent insert for existing auth users if possible)
-- We can't easily sync auth.users -> public.profiles in sql without permissions, so we skip this.
-- Instead we rely on the Join.

-- Re-apply the RPC function to ensure it exists and is correct
CREATE OR REPLACE FUNCTION get_relationship_health_dashboard(
  p_entity_type text DEFAULT NULL,
  p_risk_filter text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  entity_type communication_entity_type,
  entity_id uuid,
  owner_id uuid,
  entity_name text,
  entity_email text,
  entity_avatar text,
  total_communications integer,
  inbound_count integer,
  outbound_count integer,
  engagement_score numeric,
  response_rate numeric,
  avg_sentiment numeric,
  sentiment_trend text,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  days_since_contact integer,
  risk_level relationship_risk_level,
  health_score numeric,
  recommended_action text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.entity_type,
    r.entity_id,
    r.owner_id,
    -- Resolve Entity Name
    COALESCE(
      CASE 
        WHEN r.entity_type = 'candidate' THEN cp.full_name
        WHEN r.entity_type = 'company' THEN c.name
        WHEN r.entity_type = 'prospect' THEN pr.full_name
        WHEN r.entity_type IN ('internal', 'partner', 'stakeholder') THEN p.full_name
        ELSE NULL
      END,
      -- Better fallback
      initcap(r.entity_type::text) || ' ' || SUBSTRING(r.entity_id::text, 1, 8)
    ) as entity_name,
    
    -- Resolve Entity Email
    COALESCE(
      CASE 
        WHEN r.entity_type = 'candidate' THEN cp.email
        WHEN r.entity_type = 'company' THEN NULL 
        WHEN r.entity_type = 'prospect' THEN pr.email
        WHEN r.entity_type IN ('internal', 'partner', 'stakeholder') THEN p.email
        ELSE NULL
      END
    ) as entity_email,

    -- Resolve Avatar
    COALESCE(
      CASE 
        WHEN r.entity_type IN ('internal', 'partner', 'stakeholder') THEN p.avatar_url
        WHEN r.entity_type = 'candidate' THEN cp.avatar_url
        WHEN r.entity_type = 'company' THEN c.logo_url
        ELSE NULL
      END
    ) as entity_avatar,

    r.total_communications,
    r.inbound_count,
    r.outbound_count,
    r.engagement_score,
    r.response_rate,
    r.avg_sentiment,
    r.sentiment_trend,
    r.last_inbound_at,
    r.last_outbound_at,
    r.days_since_contact,
    r.risk_level,
    r.health_score,
    r.recommended_action,
    r.updated_at
  FROM
    communication_relationship_scores r
    LEFT JOIN candidate_profiles cp ON r.entity_type = 'candidate' AND r.entity_id = cp.id
    LEFT JOIN companies c ON r.entity_type = 'company' AND r.entity_id = c.id
    LEFT JOIN crm_prospects pr ON r.entity_type = 'prospect' AND r.entity_id = pr.id
    LEFT JOIN profiles p ON r.entity_type IN ('internal', 'partner', 'stakeholder') AND r.entity_id = p.id
  WHERE
    (p_entity_type IS NULL OR r.entity_type::text = p_entity_type)
    AND
    (p_risk_filter IS NULL OR p_risk_filter = 'all' OR r.risk_level::text = p_risk_filter)
  ORDER BY
    r.risk_level::text = 'critical' DESC,
    r.risk_level::text = 'high' DESC,
    r.health_score ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

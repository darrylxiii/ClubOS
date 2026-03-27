-- Create the match_candidates_to_job RPC function
-- Used by the match-candidates edge function for vector similarity search
-- Returns candidate profile IDs with similarity scores for hybrid ML matching

CREATE OR REPLACE FUNCTION match_candidates_to_job(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 50
)
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  full_name text,
  current_title text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id AS profile_id,
    cp.user_id,
    cp.full_name,
    cp.current_title,
    (1 - (cp.profile_embedding <=> query_embedding))::float AS similarity
  FROM candidate_profiles cp
  WHERE cp.profile_embedding IS NOT NULL
    AND 1 - (cp.profile_embedding <=> query_embedding) >= match_threshold
  ORDER BY cp.profile_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

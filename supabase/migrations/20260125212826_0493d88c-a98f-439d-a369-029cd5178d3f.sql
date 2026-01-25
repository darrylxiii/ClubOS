-- Create semantic_search_query RPC function for pgvector similarity search
CREATE OR REPLACE FUNCTION semantic_search_query(
  query_embedding vector(1536),
  match_table text,
  match_column text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10,
  filter_entity_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  entity_id uuid,
  entity_type text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For intelligence_embeddings table (meeting entity types)
  IF match_table = 'intelligence_embeddings' THEN
    RETURN QUERY
    SELECT 
      ie.id,
      ie.entity_id,
      ie.entity_type,
      ie.content,
      ie.metadata,
      (1 - (ie.embedding <=> query_embedding))::float as similarity
    FROM intelligence_embeddings ie
    WHERE ie.embedding IS NOT NULL
      AND (filter_entity_type IS NULL OR ie.entity_type = filter_entity_type)
      AND (1 - (ie.embedding <=> query_embedding)) >= match_threshold
    ORDER BY ie.embedding <=> query_embedding
    LIMIT match_count;
  -- For candidate_profiles table
  ELSIF match_table = 'candidate_profiles' THEN
    RETURN QUERY
    SELECT 
      cp.id,
      cp.user_id as entity_id,
      'candidate'::text as entity_type,
      cp.bio as content,
      jsonb_build_object('full_name', cp.full_name, 'current_title', cp.current_title, 'current_company', cp.current_company) as metadata,
      (1 - (cp.profile_embedding <=> query_embedding))::float as similarity
    FROM candidate_profiles cp
    WHERE cp.profile_embedding IS NOT NULL
      AND (1 - (cp.profile_embedding <=> query_embedding)) >= match_threshold
    ORDER BY cp.profile_embedding <=> query_embedding
    LIMIT match_count;
  -- For jobs table
  ELSIF match_table = 'jobs' THEN
    RETURN QUERY
    SELECT 
      j.id,
      j.id as entity_id,
      'job'::text as entity_type,
      j.description as content,
      jsonb_build_object('title', j.title, 'department', j.department, 'location', j.location) as metadata,
      (1 - (j.job_embedding <=> query_embedding))::float as similarity
    FROM jobs j
    WHERE j.job_embedding IS NOT NULL
      AND (1 - (j.job_embedding <=> query_embedding)) >= match_threshold
    ORDER BY j.job_embedding <=> query_embedding
    LIMIT match_count;
  -- For knowledge_base_articles table
  ELSIF match_table = 'knowledge_base_articles' THEN
    RETURN QUERY
    SELECT 
      kb.id,
      kb.id as entity_id,
      'knowledge'::text as entity_type,
      kb.content,
      jsonb_build_object('title', kb.title, 'category', kb.category, 'tags', kb.tags) as metadata,
      (1 - (kb.content_embedding <=> query_embedding))::float as similarity
    FROM knowledge_base_articles kb
    WHERE kb.content_embedding IS NOT NULL
      AND (1 - (kb.content_embedding <=> query_embedding)) >= match_threshold
    ORDER BY kb.content_embedding <=> query_embedding
    LIMIT match_count;
  -- For company_interactions table
  ELSIF match_table = 'company_interactions' THEN
    RETURN QUERY
    SELECT 
      ci.id,
      ci.company_id as entity_id,
      'interaction'::text as entity_type,
      ci.notes as content,
      jsonb_build_object('interaction_type', ci.interaction_type, 'context', ci.context) as metadata,
      (1 - (ci.interaction_embedding <=> query_embedding))::float as similarity
    FROM company_interactions ci
    WHERE ci.interaction_embedding IS NOT NULL
      AND (1 - (ci.interaction_embedding <=> query_embedding)) >= match_threshold
    ORDER BY ci.interaction_embedding <=> query_embedding
    LIMIT match_count;
  END IF;
  
  RETURN;
END;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION semantic_search_query TO authenticated, service_role;
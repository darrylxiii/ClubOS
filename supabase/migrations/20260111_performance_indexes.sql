-- Optimizing Relationship Health Dashboard
-- We filter by entity_type and risk_level, and sort by health_score/risk_level

-- 1. Composite index for filtering
CREATE INDEX IF NOT EXISTS idx_relationship_health_filter 
ON communication_relationship_scores(entity_type, risk_level);

-- 2. Index for sorting by health
CREATE INDEX IF NOT EXISTS idx_relationship_health_score 
ON communication_relationship_scores(health_score);

-- 3. Composite index for faster joins (used in the RPC function)
CREATE INDEX IF NOT EXISTS idx_relationship_entity_lookup
ON communication_relationship_scores(entity_type, entity_id);

-- Optimizing Candidate Board (Kanban)
-- heavily filters by "stage"
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_stage 
ON candidate_profiles(stage);

-- Optimizing General Search
-- Trigram index for fuzzy search on names if pg_trgm extension exists, otherwise btree prefix
CREATE INDEX IF NOT EXISTS idx_profiles_name_search 
ON profiles(full_name);

-- Optimizing Message Threads
-- We often query generic messages by related entity
CREATE INDEX IF NOT EXISTS idx_messages_entity_lookup
ON communication_messages(related_entity_type, related_entity_id);

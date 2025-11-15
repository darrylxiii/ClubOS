-- Add unique constraint for interaction_ml_features upsert to work properly
ALTER TABLE interaction_ml_features 
ADD CONSTRAINT interaction_ml_features_entity_period_key 
UNIQUE (entity_type, entity_id, period_start);
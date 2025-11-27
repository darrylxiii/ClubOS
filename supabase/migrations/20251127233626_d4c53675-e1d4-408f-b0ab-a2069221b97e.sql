-- Fix security warnings: Add search_path to trigger functions

CREATE OR REPLACE FUNCTION queue_embedding_generation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO intelligence_queue (entity_type, entity_id, processing_type, priority)
  VALUES (TG_TABLE_NAME, NEW.id, 'generate_embedding', 7);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION queue_interaction_insights()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO intelligence_queue (entity_type, entity_id, processing_type, priority)
  VALUES ('company_interactions', NEW.id, 'extract_insights', 6);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION queue_training_data_update()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('interviewed', 'hired', 'rejected', 'offer') THEN
    INSERT INTO intelligence_queue (entity_type, entity_id, processing_type, priority)
    VALUES ('applications', NEW.id, 'update_training_label', 8);
  END IF;
  RETURN NEW;
END;
$$;
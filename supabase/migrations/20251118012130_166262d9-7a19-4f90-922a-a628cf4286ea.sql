-- Fix security warnings: Add search_path to new functions

CREATE OR REPLACE FUNCTION generate_support_ticket_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM support_tickets
  WHERE ticket_number ~ '^TQC-[0-9]+$';
  
  RETURN 'TQC-' || LPAD(next_number::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION set_support_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_support_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION check_support_ticket_sla()
RETURNS TRIGGER AS $$
DECLARE
  sla_policy RECORD;
  company_tier TEXT;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT COALESCE(c.membership_tier, 'standard') INTO company_tier
    FROM companies c
    WHERE c.id = NEW.company_id;
  ELSE
    company_tier := 'standard';
  END IF;
  
  SELECT * INTO sla_policy
  FROM support_sla_policies
  WHERE customer_tier = company_tier
  AND priority_level = NEW.priority;
  
  IF FOUND THEN
    NEW.sla_target_response_minutes := sla_policy.target_first_response_minutes;
    NEW.sla_target_resolution_hours := sla_policy.target_resolution_hours;
    
    IF NEW.first_response_at IS NOT NULL AND (OLD.first_response_at IS NULL OR TG_OP = 'INSERT') THEN
      NEW.actual_response_minutes := EXTRACT(EPOCH FROM (NEW.first_response_at - NEW.created_at)) / 60;
      IF NEW.actual_response_minutes > NEW.sla_target_response_minutes THEN
        NEW.sla_breached := true;
      END IF;
    END IF;
    
    IF NEW.resolved_at IS NOT NULL AND (OLD.resolved_at IS NULL OR TG_OP = 'INSERT') THEN
      NEW.actual_resolution_hours := EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.created_at)) / 3600;
      IF NEW.actual_resolution_hours > NEW.sla_target_resolution_hours THEN
        NEW.sla_breached := true;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';

CREATE OR REPLACE FUNCTION increment_kb_article_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE knowledge_base_articles
  SET view_count = view_count + 1
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION update_kb_helpful_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.was_helpful THEN
    UPDATE knowledge_base_articles
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.article_id;
  ELSE
    UPDATE knowledge_base_articles
    SET not_helpful_count = not_helpful_count + 1
    WHERE id = NEW.article_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
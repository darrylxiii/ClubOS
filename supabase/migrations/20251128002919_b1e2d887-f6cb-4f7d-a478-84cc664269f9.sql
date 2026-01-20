-- Fix security warnings: Set search_path for functions

-- Fix auto_join_default_server function
CREATE OR REPLACE FUNCTION auto_join_default_server()
RETURNS trigger AS $$
BEGIN
  INSERT INTO live_server_members (server_id, user_id, role)
  SELECT s.id, NEW.id, 'member'
  FROM live_servers s
  WHERE s.is_default = true
  ON CONFLICT (server_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix join_default_server function
CREATE OR REPLACE FUNCTION join_default_server()
RETURNS void AS $$
BEGIN
  INSERT INTO live_server_members (server_id, user_id, role)
  SELECT s.id, auth.uid(), 'member'
  FROM live_servers s
  WHERE s.is_default = true
  ON CONFLICT (server_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
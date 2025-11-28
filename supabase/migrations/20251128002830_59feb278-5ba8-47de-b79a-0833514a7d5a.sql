-- Phase 1: Fix critical channel visibility issue

-- 1. Create auto-join function for default server
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger to auto-add users to default server on profile creation
CREATE TRIGGER auto_join_default_server_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auto_join_default_server();

-- 3. Add RLS policy to allow viewing default server for all authenticated users
CREATE POLICY "All authenticated users can view default server"
ON live_servers FOR SELECT
TO authenticated
USING (is_default = true OR id IN (
  SELECT server_id FROM live_server_members WHERE user_id = auth.uid()
));

-- 4. Create RPC function to manually join default server (for existing users)
CREATE OR REPLACE FUNCTION join_default_server()
RETURNS void AS $$
BEGIN
  INSERT INTO live_server_members (server_id, user_id, role)
  SELECT s.id, auth.uid(), 'member'
  FROM live_servers s
  WHERE s.is_default = true
  ON CONFLICT (server_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
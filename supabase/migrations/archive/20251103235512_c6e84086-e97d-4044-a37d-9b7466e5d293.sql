-- Fix role switching issues

-- 1. Update user_preferences RLS policies to use 'authenticated' role consistently
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Add admin access to user_preferences for support/debugging
CREATE POLICY "Admins can manage all preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create a function to initialize user preferences with their highest priority role
CREATE OR REPLACE FUNCTION initialize_user_preference()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_preferred_role text;
BEGIN
  -- Determine the highest priority role for the new user
  SELECT role::text INTO v_preferred_role
  FROM user_roles
  WHERE user_id = NEW.user_id
  ORDER BY 
    CASE role::text
      WHEN 'admin' THEN 1
      WHEN 'strategist' THEN 2
      WHEN 'partner' THEN 3
      WHEN 'company_admin' THEN 4
      WHEN 'recruiter' THEN 5
      WHEN 'user' THEN 6
      ELSE 7
    END
  LIMIT 1;

  -- Insert preference if it doesn't exist
  INSERT INTO user_preferences (user_id, preferred_role_view)
  VALUES (NEW.user_id, COALESCE(v_preferred_role, 'user'))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. Create trigger to auto-initialize preferences when a new role is assigned
DROP TRIGGER IF EXISTS trigger_initialize_user_preference ON user_roles;
CREATE TRIGGER trigger_initialize_user_preference
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_preference();

-- 5. Backfill missing preferences for existing users
INSERT INTO user_preferences (user_id, preferred_role_view)
SELECT DISTINCT ON (ur.user_id)
  ur.user_id,
  ur.role::text as preferred_role
FROM user_roles ur
LEFT JOIN user_preferences up ON up.user_id = ur.user_id
WHERE up.user_id IS NULL
ORDER BY ur.user_id,
  CASE ur.role::text
    WHEN 'admin' THEN 1
    WHEN 'strategist' THEN 2
    WHEN 'partner' THEN 3
    WHEN 'company_admin' THEN 4
    WHEN 'recruiter' THEN 5
    WHEN 'user' THEN 6
    ELSE 7
  END
ON CONFLICT (user_id) DO NOTHING;

-- 6. Update NULL preferred_role_view to the user's highest priority role
UPDATE user_preferences up
SET preferred_role_view = subq.role::text,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (ur.user_id)
    ur.user_id,
    ur.role
  FROM user_roles ur
  ORDER BY ur.user_id,
    CASE ur.role::text
      WHEN 'admin' THEN 1
      WHEN 'strategist' THEN 2
      WHEN 'partner' THEN 3
      WHEN 'company_admin' THEN 4
      WHEN 'recruiter' THEN 5
      WHEN 'user' THEN 6
      ELSE 7
    END
) subq
WHERE up.user_id = subq.user_id
AND up.preferred_role_view IS NULL;
-- Create workspace type enum
CREATE TYPE workspace_type AS ENUM ('personal', 'team', 'company');

-- Create workspace member role enum
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'editor', 'member', 'viewer');

-- Create workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  icon_emoji TEXT DEFAULT '📁',
  icon_url TEXT,
  cover_url TEXT,
  type workspace_type NOT NULL DEFAULT 'team',
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create workspace_members table
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Create workspace_invitations table
CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role workspace_role DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add workspace_id to workspace_pages
ALTER TABLE workspace_pages ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_workspaces_company_id ON workspaces(company_id);
CREATE INDEX idx_workspaces_created_by ON workspaces(created_by);
CREATE INDEX idx_workspaces_type ON workspaces(type);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_workspace_pages_workspace_id ON workspace_pages(workspace_id);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces FOR SELECT
  USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND is_active = true)
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Workspace owners and admins can update"
  ON workspaces FOR UPDATE
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Only workspace owners can delete"
  ON workspaces FOR DELETE
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );

-- RLS Policies for workspace_members
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Workspace owners and admins can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
    OR user_id = auth.uid() -- Users can add themselves (for accepting invitations)
  );

CREATE POLICY "Workspace owners and admins can update members"
  ON workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
    OR user_id = auth.uid() -- Users can update their own membership
  );

CREATE POLICY "Workspace owners can remove members"
  ON workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
    )
    OR user_id = auth.uid() -- Users can remove themselves (leave workspace)
  );

-- RLS Policies for workspace_invitations
CREATE POLICY "Users can view invitations for their workspaces"
  ON workspace_invitations FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Workspace owners and admins can create invitations"
  ON workspace_invitations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Workspace owners and admins can update invitations"
  ON workspace_invitations FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Workspace owners and admins can delete invitations"
  ON workspace_invitations FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- Update workspace_pages RLS to include workspace access
DROP POLICY IF EXISTS "Users can view their own pages" ON workspace_pages;
CREATE POLICY "Users can view pages in their workspaces or own pages"
  ON workspace_pages FOR SELECT
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can create pages" ON workspace_pages;
CREATE POLICY "Users can create pages in their workspaces"
  ON workspace_pages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor') AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update their own pages" ON workspace_pages;
CREATE POLICY "Users can update pages in their workspaces"
  ON workspace_pages FOR UPDATE
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor') AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can delete their own pages" ON workspace_pages;
CREATE POLICY "Users can delete pages in their workspaces"
  ON workspace_pages FOR DELETE
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- Function to create personal workspace for new users
CREATE OR REPLACE FUNCTION create_personal_workspace()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create personal workspace
  INSERT INTO workspaces (name, type, created_by, slug, icon_emoji)
  VALUES ('My Workspace', 'personal', NEW.id, 'personal-' || NEW.id, '🔒')
  RETURNING id INTO new_workspace_id;
  
  -- Add user as owner
  INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (new_workspace_id, NEW.id, 'owner', now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user personal workspace
CREATE TRIGGER on_profile_created_workspace
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_personal_workspace();

-- Function to create company workspace
CREATE OR REPLACE FUNCTION create_company_workspace()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create company workspace
  INSERT INTO workspaces (name, type, company_id, slug, icon_emoji)
  VALUES (NEW.name || ' Workspace', 'company', NEW.id, 'company-' || NEW.id, '🏢')
  RETURNING id INTO new_workspace_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new company workspace
CREATE TRIGGER on_company_created_workspace
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION create_company_workspace();

-- Function to auto-add user to company workspace when they join a company
CREATE OR REPLACE FUNCTION add_user_to_company_workspace()
RETURNS TRIGGER AS $$
DECLARE
  company_workspace_id UUID;
  member_role workspace_role;
BEGIN
  -- Find company workspace
  SELECT id INTO company_workspace_id
  FROM workspaces
  WHERE company_id = NEW.company_id AND type = 'company'
  LIMIT 1;
  
  IF company_workspace_id IS NOT NULL THEN
    -- Determine role based on company role
    member_role := CASE 
      WHEN NEW.role = 'owner' THEN 'admin'::workspace_role
      WHEN NEW.role = 'admin' THEN 'admin'::workspace_role
      ELSE 'member'::workspace_role
    END;
    
    -- Add to workspace
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (company_workspace_id, NEW.user_id, member_role, now())
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for company member auto-add
CREATE TRIGGER on_company_member_added_workspace
  AFTER INSERT ON company_members
  FOR EACH ROW EXECUTE FUNCTION add_user_to_company_workspace();

-- Update timestamps trigger
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workspace_members_updated_at
  BEFORE UPDATE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Backfill: Create personal workspaces for existing users
DO $$
DECLARE
  profile_record RECORD;
  new_workspace_id UUID;
BEGIN
  FOR profile_record IN SELECT id FROM profiles WHERE id NOT IN (
    SELECT created_by FROM workspaces WHERE type = 'personal' AND created_by IS NOT NULL
  ) LOOP
    -- Create personal workspace
    INSERT INTO workspaces (name, type, created_by, slug, icon_emoji)
    VALUES ('My Workspace', 'personal', profile_record.id, 'personal-' || profile_record.id, '🔒')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO new_workspace_id;
    
    IF new_workspace_id IS NOT NULL THEN
      -- Add user as owner
      INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
      VALUES (new_workspace_id, profile_record.id, 'owner', now())
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Backfill: Create company workspaces for existing companies
DO $$
DECLARE
  company_record RECORD;
  new_workspace_id UUID;
BEGIN
  FOR company_record IN SELECT id, name FROM companies WHERE id NOT IN (
    SELECT company_id FROM workspaces WHERE type = 'company' AND company_id IS NOT NULL
  ) LOOP
    -- Create company workspace
    INSERT INTO workspaces (name, type, company_id, slug, icon_emoji)
    VALUES (company_record.name || ' Workspace', 'company', company_record.id, 'company-' || company_record.id, '🏢')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO new_workspace_id;
  END LOOP;
END $$;

-- Backfill: Add existing company members to company workspaces
DO $$
DECLARE
  member_record RECORD;
  company_workspace_id UUID;
  member_role workspace_role;
BEGIN
  FOR member_record IN SELECT user_id, company_id, role FROM company_members LOOP
    -- Find company workspace
    SELECT id INTO company_workspace_id
    FROM workspaces
    WHERE company_id = member_record.company_id AND type = 'company'
    LIMIT 1;
    
    IF company_workspace_id IS NOT NULL THEN
      member_role := CASE 
        WHEN member_record.role = 'owner' THEN 'admin'::workspace_role
        WHEN member_record.role = 'admin' THEN 'admin'::workspace_role
        ELSE 'member'::workspace_role
      END;
      
      INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
      VALUES (company_workspace_id, member_record.user_id, member_role, now())
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Backfill: Link existing workspace_pages to personal workspaces
UPDATE workspace_pages wp
SET workspace_id = (
  SELECT w.id FROM workspaces w 
  WHERE w.created_by = wp.user_id AND w.type = 'personal'
  LIMIT 1
)
WHERE wp.workspace_id IS NULL;

-- Enable realtime for workspaces
ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members;
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_invitations;
-- Create enums for board types
CREATE TYPE board_visibility AS ENUM ('personal', 'shared', 'company');
CREATE TYPE board_member_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Create task_boards table
CREATE TABLE public.task_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  visibility board_visibility NOT NULL DEFAULT 'personal',
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Settings
  icon TEXT DEFAULT '📋',
  color TEXT DEFAULT '#6366f1',
  is_archived BOOLEAN DEFAULT false,
  allow_member_invites BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT company_board_requires_company CHECK (
    visibility != 'company' OR company_id IS NOT NULL
  ),
  CONSTRAINT personal_board_no_company CHECK (
    visibility != 'personal' OR company_id IS NULL
  )
);

-- Create task_board_members table
CREATE TABLE public.task_board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role board_member_role NOT NULL DEFAULT 'editor',
  
  -- Invitation tracking
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_viewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Create task_board_invitations table
CREATE TABLE public.task_board_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
  
  -- Who to invite
  invitee_email TEXT NOT NULL,
  invitee_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role they'll have
  role board_member_role NOT NULL DEFAULT 'editor',
  
  -- Invitation details
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invitation_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  message TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_board_invitations_unique_pending 
  ON public.task_board_invitations(board_id, invitee_email) 
  WHERE status = 'pending';

-- Add board_id to unified_tasks (make it nullable for migration)
ALTER TABLE public.unified_tasks 
  ADD COLUMN board_id UUID REFERENCES public.task_boards(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_task_boards_owner_id ON public.task_boards(owner_id);
CREATE INDEX idx_task_boards_company_id ON public.task_boards(company_id) WHERE visibility = 'company';
CREATE INDEX idx_task_board_members_user_id ON public.task_board_members(user_id) WHERE is_active = true;
CREATE INDEX idx_task_board_members_board_id ON public.task_board_members(board_id) WHERE is_active = true;
CREATE INDEX idx_task_board_invitations_invitee ON public.task_board_invitations(invitee_email, status);
CREATE INDEX idx_unified_tasks_board_id ON public.unified_tasks(board_id);

-- Helper function: Check if user can access board
CREATE OR REPLACE FUNCTION public.can_access_board(_user_id UUID, _board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM task_boards tb
    LEFT JOIN task_board_members tbm ON tb.id = tbm.board_id AND tbm.user_id = _user_id AND tbm.is_active = true
    LEFT JOIN company_members cm ON tb.company_id = cm.company_id AND cm.user_id = _user_id AND cm.is_active = true
    WHERE tb.id = _board_id
      AND tb.is_archived = false
      AND (
        tb.owner_id = _user_id
        OR tbm.user_id IS NOT NULL
        OR (tb.visibility = 'company' AND cm.user_id IS NOT NULL)
      )
  );
$$;

-- Helper function: Check if user can manage board
CREATE OR REPLACE FUNCTION public.can_manage_board(_user_id UUID, _board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM task_boards tb
    LEFT JOIN task_board_members tbm ON tb.id = tbm.board_id AND tbm.user_id = _user_id
    WHERE tb.id = _board_id
      AND tb.is_archived = false
      AND (
        tb.owner_id = _user_id
        OR tbm.role IN ('owner', 'admin')
      )
  );
$$;

-- Helper function: Get user's board role
CREATE OR REPLACE FUNCTION public.get_board_role(_user_id UUID, _board_id UUID)
RETURNS board_member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN tb.owner_id = _user_id THEN 'owner'::board_member_role
      WHEN tbm.role IS NOT NULL THEN tbm.role
      WHEN cm.role IN ('owner', 'admin') THEN 'admin'::board_member_role
      WHEN cm.role = 'recruiter' THEN 'editor'::board_member_role
      ELSE 'viewer'::board_member_role
    END
  FROM task_boards tb
  LEFT JOIN task_board_members tbm ON tb.id = tbm.board_id AND tbm.user_id = _user_id AND tbm.is_active = true
  LEFT JOIN company_members cm ON tb.company_id = cm.company_id AND cm.user_id = _user_id AND cm.is_active = true
  WHERE tb.id = _board_id
  LIMIT 1;
$$;

-- RLS Policies for task_boards
ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible boards" ON public.task_boards
  FOR SELECT USING (
    can_access_board(auth.uid(), id)
  );

CREATE POLICY "Users can create personal/shared boards" ON public.task_boards
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id AND visibility IN ('personal', 'shared')
  );

CREATE POLICY "Company admins can create company boards" ON public.task_boards
  FOR INSERT WITH CHECK (
    visibility = 'company' 
    AND EXISTS (
      SELECT 1 FROM company_members 
      WHERE company_id = task_boards.company_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Board managers can update" ON public.task_boards
  FOR UPDATE USING (
    can_manage_board(auth.uid(), id)
  );

CREATE POLICY "Owners can delete boards" ON public.task_boards
  FOR DELETE USING (
    owner_id = auth.uid()
  );

-- RLS Policies for task_board_members
ALTER TABLE public.task_board_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View members of accessible boards" ON public.task_board_members
  FOR SELECT USING (
    can_access_board(auth.uid(), board_id)
  );

CREATE POLICY "Board managers can add members" ON public.task_board_members
  FOR INSERT WITH CHECK (
    can_manage_board(auth.uid(), board_id)
  );

CREATE POLICY "Board managers can update members" ON public.task_board_members
  FOR UPDATE USING (
    can_manage_board(auth.uid(), board_id)
  );

CREATE POLICY "Board managers can remove members" ON public.task_board_members
  FOR DELETE USING (
    can_manage_board(auth.uid(), board_id)
  );

-- RLS Policies for task_board_invitations
ALTER TABLE public.task_board_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own invitations" ON public.task_board_invitations
  FOR SELECT USING (
    auth.uid() = invited_by 
    OR auth.uid() = invitee_user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND email = task_board_invitations.invitee_email
    )
  );

CREATE POLICY "Board managers can invite" ON public.task_board_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = invited_by
    AND can_manage_board(auth.uid(), board_id)
  );

CREATE POLICY "Invitees can respond" ON public.task_board_invitations
  FOR UPDATE USING (
    auth.uid() = invitee_user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND email = task_board_invitations.invitee_email
    )
  );

-- Update RLS policies for unified_tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.unified_tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.unified_tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.unified_tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.unified_tasks;

CREATE POLICY "View tasks from accessible boards" ON public.unified_tasks
  FOR SELECT USING (
    board_id IS NULL AND created_by = auth.uid() -- Legacy tasks
    OR can_access_board(auth.uid(), board_id)
  );

CREATE POLICY "Board editors can create tasks" ON public.unified_tasks
  FOR INSERT WITH CHECK (
    get_board_role(auth.uid(), board_id) IN ('owner', 'admin', 'editor')
  );

CREATE POLICY "Board editors can update tasks" ON public.unified_tasks
  FOR UPDATE USING (
    board_id IS NULL AND created_by = auth.uid() -- Legacy tasks
    OR get_board_role(auth.uid(), board_id) IN ('owner', 'admin', 'editor')
  );

CREATE POLICY "Board editors can delete tasks" ON public.unified_tasks
  FOR DELETE USING (
    board_id IS NULL AND created_by = auth.uid() -- Legacy tasks
    OR get_board_role(auth.uid(), board_id) IN ('owner', 'admin', 'editor')
  );

-- Data Migration: Create personal boards for users with tasks
INSERT INTO public.task_boards (name, description, visibility, owner_id, icon)
SELECT DISTINCT
  'My Tasks',
  'Personal task board',
  'personal'::board_visibility,
  created_by,
  '✨'
FROM public.unified_tasks
WHERE created_by IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update existing tasks with their personal board_id
UPDATE public.unified_tasks ut
SET board_id = tb.id
FROM public.task_boards tb
WHERE tb.owner_id = ut.created_by
  AND tb.visibility = 'personal'
  AND ut.board_id IS NULL;

-- Create company boards for existing companies
INSERT INTO public.task_boards (name, description, visibility, owner_id, company_id, icon)
SELECT 
  c.name || ' Team Board',
  'Shared board for all ' || c.name || ' members',
  'company'::board_visibility,
  (
    SELECT user_id FROM company_members 
    WHERE company_id = c.id AND role IN ('owner', 'admin') 
    ORDER BY joined_at 
    LIMIT 1
  ),
  c.id,
  '🏢'
FROM public.companies c
WHERE c.is_active = true
  AND EXISTS (SELECT 1 FROM company_members WHERE company_id = c.id AND role IN ('owner', 'admin'))
ON CONFLICT DO NOTHING;

-- Trigger: Auto-create company board when new company is created
CREATE OR REPLACE FUNCTION public.auto_create_company_board()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.task_boards (name, description, visibility, owner_id, company_id, icon)
  VALUES (
    NEW.name || ' Team Board',
    'Shared board for all ' || NEW.name || ' team members',
    'company',
    NEW.created_by,
    NEW.id,
    '🏢'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_create_company_board
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_company_board();

-- Create view for user's accessible boards with computed fields
CREATE OR REPLACE VIEW public.user_accessible_boards 
WITH (security_invoker=true) 
AS
SELECT DISTINCT
  tb.id,
  tb.name,
  tb.description,
  tb.visibility,
  tb.owner_id,
  tb.company_id,
  tb.icon,
  tb.color,
  tb.is_archived,
  tb.allow_member_invites,
  tb.created_at,
  tb.updated_at,
  COALESCE(
    CASE WHEN tb.owner_id = auth.uid() THEN 'owner'::board_member_role END,
    tbm.role,
    CASE 
      WHEN cm.role IN ('owner', 'admin') THEN 'admin'::board_member_role
      WHEN cm.role = 'recruiter' THEN 'editor'::board_member_role
      ELSE 'viewer'::board_member_role
    END
  ) as my_role,
  (SELECT COUNT(*) FROM task_board_members WHERE board_id = tb.id AND is_active = true) as member_count,
  (SELECT COUNT(*) FROM unified_tasks WHERE board_id = tb.id) as task_count
FROM task_boards tb
LEFT JOIN task_board_members tbm ON tb.id = tbm.board_id AND tbm.user_id = auth.uid() AND tbm.is_active = true
LEFT JOIN company_members cm ON tb.company_id = cm.company_id AND cm.user_id = auth.uid() AND cm.is_active = true
WHERE tb.is_archived = false
  AND (
    tb.owner_id = auth.uid()
    OR tbm.user_id IS NOT NULL
    OR (tb.visibility = 'company' AND cm.user_id IS NOT NULL)
  );
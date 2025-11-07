export type BoardVisibility = 'personal' | 'shared' | 'company';
export type BoardMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface TaskBoard {
  id: string;
  name: string;
  description: string | null;
  visibility: BoardVisibility;
  owner_id: string;
  company_id: string | null;
  icon: string;
  color: string;
  is_archived: boolean;
  allow_member_invites: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed fields from view
  my_role?: BoardMemberRole;
  member_count?: number;
  task_count?: number;
}

export interface TaskBoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: BoardMemberRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  is_active: boolean;
  last_viewed_at: string | null;
  created_at: string;
  
  // Joined data
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface TaskBoardInvitation {
  id: string;
  board_id: string;
  invitee_email: string;
  invitee_user_id: string | null;
  role: BoardMemberRole;
  invited_by: string;
  invitation_token: string;
  message: string | null;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  
  // Joined data
  task_boards?: {
    name: string;
    icon: string;
  };
  invited_by_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

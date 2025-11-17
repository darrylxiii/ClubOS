export interface ResolvedTeamMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  jobRole: string;
  assignmentType: 'company_member' | 'tqc_team' | 'external_consultant';
  permissions: {
    can_view_candidates: boolean;
    can_schedule_interviews: boolean;
    can_advance_candidates: boolean;
    can_decline_candidates: boolean;
    can_make_offers: boolean;
  };
  assignmentReason?: string;
  assignedBy?: string;
  assignedAt: string;
  isPrimaryContact: boolean;
}

export function resolveTeamMember(assignment: any): ResolvedTeamMember {
  const isCompanyMember = assignment.assignment_type === 'company_member';
  const email = isCompanyMember
    ? assignment.company_member?.user?.email
    : assignment.external_user?.email;
  const fullName = isCompanyMember
    ? assignment.company_member?.user?.full_name
    : assignment.external_user?.full_name;
  
  return {
    id: assignment.id,
    userId: isCompanyMember 
      ? assignment.company_member?.user?.id 
      : assignment.external_user?.id,
    fullName: fullName || email?.split('@')[0] || 'Team Member',
    email: email || '',
    avatarUrl: isCompanyMember
      ? assignment.company_member?.user?.avatar_url
      : assignment.external_user?.avatar_url,
    jobTitle: isCompanyMember
      ? assignment.company_member?.job_title
      : assignment.assignment_metadata?.title || null,
    jobRole: assignment.job_role,
    assignmentType: assignment.assignment_type,
    permissions: {
      can_view_candidates: assignment.can_view_candidates,
      can_schedule_interviews: assignment.can_schedule_interviews,
      can_advance_candidates: assignment.can_advance_candidates,
      can_decline_candidates: assignment.can_decline_candidates,
      can_make_offers: assignment.can_make_offers,
    },
    assignmentReason: assignment.assignment_reason,
    assignedBy: assignment.assigned_by_user?.full_name || 'Unknown',
    assignedAt: assignment.created_at,
    isPrimaryContact: assignment.is_primary_contact,
  };
}

export function getAssignmentTypeBadge(type: string) {
  switch (type) {
    case 'tqc_team':
      return {
        label: 'TQC',
        variant: 'default' as const,
        className: 'bg-[hsl(var(--quantum-gold))]/10 text-[hsl(var(--quantum-gold))] border-[hsl(var(--quantum-gold))]/20'
      };
    case 'external_consultant':
      return {
        label: 'External',
        variant: 'secondary' as const,
        className: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      };
    default:
      return null;
  }
}

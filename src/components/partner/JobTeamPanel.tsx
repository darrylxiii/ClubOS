import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Plus, Crown, UserCheck, Eye, MoreVertical, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddJobTeamMemberDialog } from './AddJobTeamMemberDialog';
import { resolveTeamMember, getAssignmentTypeBadge, ResolvedTeamMember } from '@/utils/jobTeamUtils';
import { ListSkeleton } from '@/components/LoadingSkeletons';

interface JobTeamPanelProps {
  jobId: string;
}

export const JobTeamPanel = ({ jobId }: JobTeamPanelProps) => {
  const [teamMembers, setTeamMembers] = useState<ResolvedTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCompanyTeam, setShowCompanyTeam] = useState(true);
  const [showExternalTeam, setShowExternalTeam] = useState(true);

  useEffect(() => {
    fetchTeamMembers();

    // Real-time subscription
    const channel = supabase
      .channel(`job-team-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_team_assignments',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          fetchTeamMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchTeamMembers = async () => {
    try {
      const { data: assignments, error } = await supabase
        .from('job_team_assignments')
        .select('*')
        .eq('job_id', jobId)
        .order('assignment_type', { ascending: true })
        .order('is_primary_contact', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching team members:', error);
        if (error.code !== 'PGRST116') {
          toast.error('Failed to load team members');
        }
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      if (!assignments || assignments.length === 0) {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      // Fetch company members
      const companyMemberIds = assignments
        .filter(a => a.company_member_id)
        .map(a => a.company_member_id);
      
      let companyMembers: any[] = [];
      if (companyMemberIds.length > 0) {
        const { data: cmData } = await supabase
          .from('company_members')
          .select('id, job_title, user_id')
          .in('id', companyMemberIds);
        
        if (cmData) {
          const userIds = cmData.map(cm => cm.user_id).filter(Boolean);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', userIds);
          
          companyMembers = cmData.map(cm => ({
            ...cm,
            user: profiles?.find(p => p.id === cm.user_id)
          }));
        }
      }

      // Fetch external users
      const externalUserIds = assignments
        .filter(a => a.external_user_id)
        .map(a => a.external_user_id);
      
      let externalUsers: any[] = [];
      if (externalUserIds.length > 0) {
        const { data: euData } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', externalUserIds);
        externalUsers = euData || [];
      }

      // Fetch assigned by users
      const assignedByIds = assignments
        .filter(a => a.assigned_by)
        .map(a => a.assigned_by);
      
      let assignedByUsers: any[] = [];
      if (assignedByIds.length > 0) {
        const { data: abData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assignedByIds);
        assignedByUsers = abData || [];
      }

      // Combine all data
      const enrichedAssignments = assignments.map(assignment => ({
        ...assignment,
        company_member: companyMembers.find(cm => cm.id === assignment.company_member_id),
        external_user: externalUsers.find(eu => eu.id === assignment.external_user_id),
        assigned_by_user: assignedByUsers.find(ab => ab.id === assignment.assigned_by)
      }));

      const resolved = enrichedAssignments.map(resolveTeamMember);
      setTeamMembers(resolved);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('job_team_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      toast.success('Team member removed');
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'hiring_manager':
        return <Crown className="w-3 h-3" />;
      case 'founder_reviewer':
        return <Crown className="w-3 h-3 text-purple-500" />;
      case 'technical_interviewer':
      case 'behavioral_interviewer':
      case 'panel_member':
        return <UserCheck className="w-3 h-3" />;
      case 'observer':
        return <Eye className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  const getRoleLabel = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'hiring_manager':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'founder_reviewer':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'technical_interviewer':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'behavioral_interviewer':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'panel_member':
        return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'observer':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const companyTeam = teamMembers.filter((m) => m.assignmentType === 'company_member');
  const externalTeam = teamMembers.filter((m) => m.assignmentType !== 'company_member');

  const renderTeamMember = (member: ResolvedTeamMember) => {
    const typeBadge = getAssignmentTypeBadge(member.assignmentType);
    
    return (
      <div key={member.id} className="flex items-start gap-3 p-3 hover:bg-accent/50 rounded-lg transition-colors group">
        <Avatar className="w-10 h-10">
          <AvatarImage src={member.avatarUrl || ''} />
          <AvatarFallback>{member.fullName?.[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{member.fullName}</span>
            {member.isPrimaryContact && (
              <Badge variant="secondary" className="text-xs">
                <Crown className="w-3 h-3 mr-1" />
                Primary
              </Badge>
            )}
            {typeBadge && (
              <Badge variant={typeBadge.variant} className={typeBadge.className}>
                {typeBadge.label}
              </Badge>
            )}
          </div>

          <div className="text-xs text-muted-foreground mb-2">
            {member.jobTitle && <span>{member.jobTitle} • </span>}
            <span>{member.email}</span>
          </div>

          <Badge variant="outline" className={getRoleColor(member.jobRole)}>
            {getRoleIcon(member.jobRole)}
            <span className="ml-1">{getRoleLabel(member.jobRole)}</span>
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" aria-label="Team member options">
              <MoreVertical className="w-4 h-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleRemoveMember(member.id)} className="text-destructive">
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ListSkeleton count={3} />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              Team
              <div className="flex gap-2">
                <Badge variant="outline">{companyTeam.length} Company</Badge>
                {externalTeam.length > 0 && <Badge variant="secondary">{externalTeam.length} External</Badge>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No team members yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {companyTeam.map(renderTeamMember)}
              {externalTeam.map(renderTeamMember)}
            </div>
          )}
        </CardContent>
      </Card>
      <AddJobTeamMemberDialog
        jobId={jobId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdded={fetchTeamMembers}
      />
    </>
  );
};

const TeamMemberCard = ({ member, onRemove }: { member: any; onRemove: () => void }) => {
  const user = member.company_member?.user;
  const [interviewCount, setInterviewCount] = useState<number | null>(null);

  useEffect(() => {
    fetchInterviewCount();
  }, [member.id]);

  const fetchInterviewCount = async () => {
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', member.job_id)
      .eq('is_interview_booking', true)
      .gte('scheduled_start', new Date().toISOString())
      .contains('interviewer_ids', [member.company_member_id]);

    setInterviewCount(count || 0);
  };

  const handleRemove = async () => {
    try {
      const { error } = await supabase
        .from('job_team_assignments')
        .delete()
        .eq('id', member.id);

      if (error) throw error;
      toast.success('Team member removed');
      onRemove();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
      <Avatar className="w-10 h-10 border-2 border-background">
        <AvatarImage src={user?.avatar_url} />
        <AvatarFallback>
          {user?.full_name
            ?.split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase() || '??'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-sm truncate">{user?.full_name}</p>
          {member.is_primary_contact && (
            <Badge variant="secondary" className="text-xs">
              Primary
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mb-2">
          {member.company_member?.job_title || user?.email}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`text-xs flex items-center gap-1 ${getRoleColor(member.job_role)}`}
          >
            {getRoleIcon(member.job_role)}
            {getRoleLabel(member.job_role)}
          </Badge>
          {interviewCount !== null && interviewCount > 0 && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              {interviewCount} upcoming
            </Badge>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Team member options">
            <MoreVertical className="w-4 h-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleRemove} className="text-destructive">
            Remove from team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'hiring_manager':
      return <Crown className="w-3 h-3" />;
    case 'founder_reviewer':
      return <Crown className="w-3 h-3 text-purple-500" />;
    case 'technical_interviewer':
    case 'behavioral_interviewer':
    case 'panel_member':
      return <UserCheck className="w-3 h-3" />;
    case 'observer':
      return <Eye className="w-3 h-3" />;
    default:
      return <Users className="w-3 h-3" />;
  }
};

const getRoleLabel = (role: string) => {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'hiring_manager':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'founder_reviewer':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'technical_interviewer':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'behavioral_interviewer':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'panel_member':
      return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
    case 'observer':
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

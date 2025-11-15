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

interface JobTeamPanelProps {
  jobId: string;
}

export const JobTeamPanel = ({ jobId }: JobTeamPanelProps) => {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

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
      const { data, error } = await supabase
        .from('job_team_assignments')
        .select(`
          *,
          company_member:company_members(
            id,
            job_title,
            user:profiles(
              id,
              full_name,
              email,
              avatar_url
            )
          )
        `)
        .eq('job_id', jobId)
        .order('is_primary_contact', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
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

  const getInterviewLoad = async (memberId: string) => {
    // Fetch upcoming interviews count for this member
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('is_interview_booking', true)
      .gte('scheduled_start', new Date().toISOString())
      .contains('interviewer_ids', [memberId]);

    return count || 0;
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
          <p className="text-sm text-muted-foreground">Loading team...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {teamMembers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No team members assigned</p>
              <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
            </div>
          ) : (
            teamMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onRemove={() => fetchTeamMembers()}
              />
            ))
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
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="w-4 h-4" />
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

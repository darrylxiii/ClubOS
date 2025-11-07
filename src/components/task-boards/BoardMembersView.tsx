import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskBoardMember, BoardMemberRole } from '@/types/taskBoard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface BoardMembersViewProps {
  boardId: string;
  canManage: boolean;
}

export function BoardMembersView({ boardId, canManage }: BoardMembersViewProps) {
  const [members, setMembers] = useState<TaskBoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = async () => {
    try {
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('task_board_members')
        .select('*')
        .eq('board_id', boardId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;

      // Fetch profiles for all member user_ids
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge members with profiles
      const membersWithProfiles = membersData?.map(member => ({
        ...member,
        profiles: profilesData?.find(p => p.id === member.user_id) || null
      })) || [];

      setMembers(membersWithProfiles as TaskBoardMember[]);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [boardId]);

  const handleRoleChange = async (memberId: string, newRole: BoardMemberRole) => {
    try {
      const { error } = await supabase
        .from('task_board_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      
      toast.success('Role updated');
      loadMembers();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the board?')) return;

    try {
      const { error } = await supabase
        .from('task_board_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member removed');
      loadMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading members...</div>;
  }

  if (members.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No members yet. Use the Invite tab to add members.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={member.profiles?.avatar_url || undefined} />
              <AvatarFallback>
                {member.profiles?.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{member.profiles?.full_name || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManage && member.role !== 'owner' ? (
              <>
                <Select
                  value={member.role}
                  onValueChange={(value) => handleRoleChange(member.id, value as BoardMemberRole)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Badge variant="secondary">{member.role}</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

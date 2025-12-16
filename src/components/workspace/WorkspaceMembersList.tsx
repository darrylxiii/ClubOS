import { useState } from 'react';
import { Crown, MoreHorizontal, Shield, UserMinus, UserCog } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWorkspaceMembers, WorkspaceMember } from '@/hooks/useWorkspaceMembers';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface WorkspaceMembersListProps {
  workspaceId: string;
  className?: string;
}

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-yellow-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-500' },
  editor: { label: 'Editor', icon: UserCog, color: 'text-green-500' },
  member: { label: 'Member', icon: null, color: '' },
  viewer: { label: 'Viewer', icon: null, color: 'text-muted-foreground' },
} as const;

export function WorkspaceMembersList({ workspaceId, className }: WorkspaceMembersListProps) {
  const { user } = useAuth();
  const { members, isOwner, isAdmin, updateMemberRole, removeMember, transferOwnership } = useWorkspaceMembers(workspaceId);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null);

  const handleRemove = () => {
    if (selectedMember) {
      removeMember.mutate(selectedMember.id);
      setRemoveDialogOpen(false);
      setSelectedMember(null);
    }
  };

  const handleTransfer = () => {
    if (selectedMember && user?.id) {
      transferOwnership.mutate({
        currentOwnerId: user.id,
        newOwnerId: selectedMember.user_id,
      });
      setTransferDialogOpen(false);
      setSelectedMember(null);
    }
  };

  const canManageMember = (member: WorkspaceMember) => {
    if (member.user_id === user?.id) return false; // Can't manage yourself
    if (member.role === 'owner') return false; // Can't manage owner
    if (isOwner) return true;
    if (isAdmin && member.role !== 'admin') return true;
    return false;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {members.map((member) => {
        const roleConfig = ROLE_CONFIG[member.role];
        const RoleIcon = roleConfig.icon;
        const isCurrentUser = member.user_id === user?.id;

        return (
          <div
            key={member.id}
            className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {member.profile?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.profile?.full_name || 'Unknown'}
                  {isCurrentUser && (
                    <span className="text-muted-foreground ml-1">(you)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.profile?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className={cn("gap-1", roleConfig.color)}>
                {RoleIcon && <RoleIcon className="h-3 w-3" />}
                {roleConfig.label}
              </Badge>

              {canManageMember(member) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                    {isOwner && (
                      <DropdownMenuItem
                        onClick={() => updateMemberRole.mutate({ memberId: member.id, role: 'admin' })}
                        disabled={member.role === 'admin'}
                      >
                        <Shield className="h-4 w-4 mr-2 text-blue-500" />
                        Make Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => updateMemberRole.mutate({ memberId: member.id, role: 'editor' })}
                      disabled={member.role === 'editor'}
                    >
                      <UserCog className="h-4 w-4 mr-2 text-green-500" />
                      Make Editor
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateMemberRole.mutate({ memberId: member.id, role: 'member' })}
                      disabled={member.role === 'member'}
                    >
                      Make Member
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateMemberRole.mutate({ memberId: member.id, role: 'viewer' })}
                      disabled={member.role === 'viewer'}
                    >
                      Make Viewer
                    </DropdownMenuItem>

                    {isOwner && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedMember(member);
                            setTransferDialogOpen(true);
                          }}
                        >
                          <Crown className="h-4 w-4 mr-2 text-yellow-500" />
                          Transfer Ownership
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setSelectedMember(member);
                        setRemoveDialogOpen(true);
                      }}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove from Workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}

      {/* Remove Member Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.profile?.full_name || 'this member'} from the workspace?
              They will lose access to all pages in this workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Dialog */}
      <AlertDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to transfer ownership to {selectedMember?.profile?.full_name}?
              You will become an admin and they will have full control of the workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer}>
              Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

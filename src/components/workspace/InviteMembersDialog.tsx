import { useState } from 'react';
import { Copy, Mail, Send, UserPlus, X, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWorkspaceInvitations, WorkspaceInvitation } from '@/hooks/useWorkspaceInvitations';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Can manage members and settings' },
  { value: 'editor', label: 'Editor', description: 'Can edit pages' },
  { value: 'member', label: 'Member', description: 'Can view and comment' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
] as const;

export function InviteMembersDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
}: InviteMembersDialogProps) {
  const { invitations, createInvitation, resendInvitation, revokeInvitation } = useWorkspaceInvitations(workspaceId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceInvitation['role']>('member');

  const handleInvite = async () => {
    if (!email.trim()) return;

    try {
      await createInvitation.mutateAsync({
        email: email.trim(),
        role,
      });
      setEmail('');
      setRole('member');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleCopyLink = (invitation: WorkspaceInvitation) => {
    const link = `${window.location.origin}/workspace/join/${invitation.token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email.trim()) {
      handleInvite();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite to {workspaceName}
          </DialogTitle>
          <DialogDescription>
            Invite team members by email. They'll receive an invitation link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invite Form */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <Select value={role} onValueChange={(v) => setRole(v as WorkspaceInvitation['role'])}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleInvite} 
                disabled={!email.trim() || createInvitation.isPending}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Pending Invitations ({invitations.length})
                </Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{invitation.email}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {invitation.role}
                      </Badge>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopyLink(invitation)}
                          title="Copy link"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => resendInvitation.mutate(invitation.id)}
                          title="Resend"
                          disabled={resendInvitation.isPending}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => revokeInvitation.mutate(invitation.id)}
                          title="Revoke"
                          disabled={revokeInvitation.isPending}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

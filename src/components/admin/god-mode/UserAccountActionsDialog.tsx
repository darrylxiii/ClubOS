import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGodMode, AccountStatus } from '@/hooks/useGodMode';
import { 
  Ban, 
  ShieldAlert, 
  ShieldCheck, 
  KeyRound, 
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAccountActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name?: string;
    email?: string;
    account_status?: AccountStatus;
    suspension_reason?: string;
    ban_reason?: string;
    force_password_reset?: boolean;
    force_password_reset_reason?: string;
  } | null;
  isSuperAdmin?: boolean;
  targetIsSuperAdmin?: boolean;
  onActionComplete?: () => void;
}

const statusConfig: Record<AccountStatus, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <CheckCircle className="h-4 w-4" /> },
  suspended: { label: 'Suspended', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <AlertTriangle className="h-4 w-4" /> },
  banned: { label: 'Banned', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: <Ban className="h-4 w-4" /> },
  pending_review: { label: 'Pending Review', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <ShieldAlert className="h-4 w-4" /> },
  read_only: { label: 'Read Only', color: 'bg-muted text-muted-foreground border-border', icon: <XCircle className="h-4 w-4" /> },
};

export function UserAccountActionsDialog({
  open,
  onOpenChange,
  user,
  isSuperAdmin = false,
  targetIsSuperAdmin = false,
  onActionComplete,
}: UserAccountActionsDialogProps) {
  const [reason, setReason] = useState('');
  const [activeTab, setActiveTab] = useState('status');
  const {
    isLoading,
    suspendUser,
    unsuspendUser,
    banUser,
    unbanUser,
    forcePasswordReset,
    clearPasswordReset,
    promoteToSuperAdmin,
    demoteFromSuperAdmin,
  } = useGodMode();

  const accountStatus = user?.account_status || 'active';
  const statusInfo = statusConfig[accountStatus];

  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  const handleAction = async (
    action: () => Promise<boolean>,
  ) => {
    const success = await action();
    if (success) {
      onActionComplete?.();
      onOpenChange(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Account Actions
          </DialogTitle>
          <DialogDescription>
            Manage account status for {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-sm text-muted-foreground">Current Status</span>
            <Badge variant="outline" className={cn('gap-1', statusInfo.color)}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </div>

          {/* Super Admin Badge */}
          {targetIsSuperAdmin && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Super Admin</span>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              {isSuperAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
            </TabsList>

            {/* Status Actions */}
            <TabsContent value="status" className="space-y-4">
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  placeholder="Enter reason for action..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {accountStatus === 'active' && (
                  <>
                    <Button
                      variant="outline"
                      className="border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
                      disabled={isLoading}
                      onClick={() => handleAction(() => suspendUser(user.id, reason))}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
                      Suspend
                    </Button>
                    <Button
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      disabled={isLoading}
                      onClick={() => handleAction(() => banUser(user.id, reason))}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                      Ban
                    </Button>
                  </>
                )}

                {accountStatus === 'suspended' && (
                  <>
                    <Button
                      variant="outline"
                      className="border-green-500/50 text-green-600 hover:bg-green-500/10"
                      disabled={isLoading}
                      onClick={() => handleAction(() => unsuspendUser(user.id))}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                      Unsuspend
                    </Button>
                    <Button
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      disabled={isLoading}
                      onClick={() => handleAction(() => banUser(user.id, reason))}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                      Escalate to Ban
                    </Button>
                  </>
                )}

                {accountStatus === 'banned' && (
                  <Button
                    variant="outline"
                    className="border-green-500/50 text-green-600 hover:bg-green-500/10 col-span-2"
                    disabled={isLoading}
                    onClick={() => handleAction(() => unbanUser(user.id))}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Unban User
                  </Button>
                )}
              </div>

              {/* Show existing reason if any */}
              {(user.suspension_reason || user.ban_reason) && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    {accountStatus === 'suspended' ? 'Suspension' : 'Ban'} Reason:
                  </p>
                  <p className="text-sm">{user.suspension_reason || user.ban_reason}</p>
                </div>
              )}
            </TabsContent>

            {/* Security Actions */}
            <TabsContent value="security" className="space-y-4">
              <div className="space-y-2">
                <Label>Password Reset Reason (optional)</Label>
                <Textarea
                  placeholder="Enter reason for forcing password reset..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                {!user.force_password_reset ? (
                  <Button
                    variant="outline"
                    className="w-full border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                    disabled={isLoading}
                    onClick={() => handleAction(() => forcePasswordReset(user.id, reason))}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                    Force Password Reset
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-green-500/50 text-green-600 hover:bg-green-500/10"
                    disabled={isLoading}
                    onClick={() => handleAction(() => clearPasswordReset(user.id))}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Clear Password Reset Requirement
                  </Button>
                )}
              </div>

              {user.force_password_reset && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <KeyRound className="h-4 w-4" />
                    <span className="text-sm font-medium">Password Reset Required</span>
                  </div>
                  {user.force_password_reset_reason && (
                    <p className="text-sm text-muted-foreground">{user.force_password_reset_reason}</p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Super Admin Actions */}
            {isSuperAdmin && (
              <TabsContent value="admin" className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    Super Admin actions require elevated privileges and are logged for audit purposes.
                  </p>
                </div>

                {!targetIsSuperAdmin ? (
                  <Button
                    variant="outline"
                    className="w-full border-primary/50 text-primary hover:bg-primary/10"
                    disabled={isLoading}
                    onClick={() => handleAction(() => promoteToSuperAdmin(user.id))}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                    Promote to Super Admin
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                    disabled={isLoading}
                    onClick={() => handleAction(() => demoteFromSuperAdmin(user.id))}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                    Demote from Super Admin
                  </Button>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

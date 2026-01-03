import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  ShieldAlert, 
  Ban, 
  KeyRound, 
  Crown,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { useGodMode, AccountStatus } from '@/hooks/useGodMode';
import { UserAccountActionsDialog } from './UserAccountActionsDialog';
import { AccountStatusBadge } from '@/components/ui/UnifiedStatusBadge';
import { Badge } from '@/components/ui/badge';

interface GodModeUserActionsProps {
  user: {
    id: string;
    full_name?: string;
    email?: string;
    account_status?: AccountStatus;
    suspension_reason?: string;
    ban_reason?: string;
    force_password_reset?: boolean;
    force_password_reset_reason?: string;
  };
  onActionComplete?: () => void;
  showStatusBadge?: boolean;
}

export function GodModeUserActions({ 
  user, 
  onActionComplete,
  showStatusBadge = true,
}: GodModeUserActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [targetIsSuperAdmin, setTargetIsSuperAdmin] = useState(false);
  const [canModify, setCanModify] = useState(false);
  const { checkIsSuperAdmin, checkCanModifyUser } = useGodMode();

  useEffect(() => {
    const checkPermissions = async () => {
      const [currentIsSuperAdmin, targetSuper, canMod] = await Promise.all([
        checkIsSuperAdmin(),
        checkIsSuperAdmin(user.id),
        checkCanModifyUser(user.id),
      ]);
      setIsSuperAdmin(currentIsSuperAdmin);
      setTargetIsSuperAdmin(targetSuper);
      setCanModify(canMod);
    };
    checkPermissions();
  }, [user.id]);

  if (!canModify) {
    return showStatusBadge ? (
      <div className="flex items-center gap-1.5">
        {targetIsSuperAdmin && (
          <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            <Crown className="h-3 w-3" />
            Super
          </Badge>
        )}
        <AccountStatusBadge status={user.account_status || 'active'} />
      </div>
    ) : null;
  }

  const accountStatus = user.account_status || 'active';

  return (
    <div className="flex items-center gap-2">
      {showStatusBadge && (
        <div className="flex items-center gap-1.5">
          {targetIsSuperAdmin && (
            <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              <Crown className="h-3 w-3" />
              Super
            </Badge>
          )}
          <AccountStatusBadge status={accountStatus} />
        </div>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Account Actions
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {accountStatus === 'active' && (
            <>
              <DropdownMenuItem 
                className="text-yellow-600"
                onClick={() => setDialogOpen(true)}
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                Suspend User
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setDialogOpen(true)}
              >
                <Ban className="h-4 w-4 mr-2" />
                Ban User
              </DropdownMenuItem>
            </>
          )}
          
          {accountStatus === 'suspended' && (
            <DropdownMenuItem 
              className="text-green-600"
              onClick={() => setDialogOpen(true)}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Unsuspend User
            </DropdownMenuItem>
          )}
          
          {accountStatus === 'banned' && (
            <DropdownMenuItem 
              className="text-green-600"
              onClick={() => setDialogOpen(true)}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Unban User
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Force Password Reset
          </DropdownMenuItem>
          
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-primary"
                onClick={() => setDialogOpen(true)}
              >
                <Crown className="h-4 w-4 mr-2" />
                {targetIsSuperAdmin ? 'Demote Super Admin' : 'Promote to Super Admin'}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <UserAccountActionsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={user}
        isSuperAdmin={isSuperAdmin}
        targetIsSuperAdmin={targetIsSuperAdmin}
        onActionComplete={onActionComplete}
      />
    </div>
  );
}

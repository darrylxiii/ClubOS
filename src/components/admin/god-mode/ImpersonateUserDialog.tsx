import { useState } from 'react';
import { Eye, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useImpersonation } from '@/hooks/useImpersonation';

interface ImpersonateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function ImpersonateUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: ImpersonateUserDialogProps) {
  const [reason, setReason] = useState('');
  const { startImpersonation, isLoading } = useImpersonation();

  const handleImpersonate = async () => {
    const success = await startImpersonation(userId, reason);
    if (success) {
      onOpenChange(false);
      // Reload to show impersonation view
      window.location.reload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-500" />
            Impersonate User
          </DialogTitle>
          <DialogDescription>
            View the platform as <strong>{userName}</strong>. This is a read-only session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500 mb-1">Important</p>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Session expires after 1 hour</li>
                  <li>All actions are logged in audit trail</li>
                  <li>Write operations are blocked</li>
                  <li>You cannot impersonate super admins</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for impersonation</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Debugging user-reported issue #1234"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              This will be recorded in the audit log
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImpersonate}
            disabled={isLoading}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Eye className="h-4 w-4 mr-2" />
            Start Impersonation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

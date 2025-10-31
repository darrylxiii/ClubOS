import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Loader2, CheckCircle, Mail } from "lucide-react";

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  onConfirm: (sendEmail: boolean) => Promise<void>;
}

export function ApprovalDialog({ 
  open, 
  onOpenChange, 
  candidateName,
  onConfirm 
}: ApprovalDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(sendWelcomeEmail);
      onOpenChange(false);
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle>Approve Application</DialogTitle>
          </div>
          <DialogDescription>
            You're about to approve <span className="font-semibold text-foreground">{candidateName}</span>'s application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">This will:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>✓ Create a user account for the candidate</li>
              <li>✓ Grant platform access with 'user' role</li>
              <li>✓ Update their profile with verified status</li>
              <li>✓ Log the approval in activity history</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-email"
              checked={sendWelcomeEmail}
              onCheckedChange={(checked) => setSendWelcomeEmail(checked as boolean)}
            />
            <Label 
              htmlFor="send-email" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send welcome email with login instructions
              </div>
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Application
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

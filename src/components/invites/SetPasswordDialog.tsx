import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssistedPasswordConfirmation } from "@/components/ui/assisted-password-confirmation";
import { validatePasswordStrength } from "@/utils/passwordReset";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
}

export function SetPasswordDialog({
  open,
  onOpenChange,
  targetUserId,
  targetName,
  targetEmail,
}: SetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const strength = validatePasswordStrength(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const canSubmit = strength.valid && passwordsMatch && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-provisioned-user", {
        body: {
          action: "set_password",
          target_user_id: targetUserId,
          password,
        },
      });

      if (error) {
        toast.error("Failed to set password. Please try again.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Temporary password set for ${targetName}. They will be prompted to change it on first login.`);
      setPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setPassword("");
      setConfirmPassword("");
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md z-[200]">
        <DialogHeader>
          <div className="w-12 h-12 mx-auto mb-2 bg-primary/10 rounded-xl flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Set Temporary Password</DialogTitle>
          <DialogDescription className="text-center">
            Set a temporary password for <span className="font-medium text-foreground">{targetName}</span>
            <br />
            <span className="text-xs">{targetEmail}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <AssistedPasswordConfirmation
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            showPasswordInput
          />

          <p className="text-xs text-muted-foreground">
            The user will be required to change this password on their first login.
          </p>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting password…
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Set Password
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

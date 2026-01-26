/**
 * Progress Saver Component
 * Visual indicator showing auto-save status and cross-device recovery option
 */

import { useState, useEffect } from "react";
import { Cloud, CloudOff, Check, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { migrateToast as toast } from "@/lib/notify";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ProgressSaverProps {
  sessionId: string;
  currentStep: number;
  formData: Record<string, any>;
  email?: string;
}

export function ProgressSaver({
  sessionId,
  currentStep,
  formData,
  email,
}: ProgressSaverProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState(email || "");
  const [isSending, setIsSending] = useState(false);

  // Visual save indicator
  useEffect(() => {
    if (currentStep > 0) {
      setStatus("saving");
      const timer = setTimeout(() => setStatus("saved"), 500);
      return () => clearTimeout(timer);
    }
  }, [formData, currentStep]);

  // Handle sending recovery email
  const handleSendRecoveryLink = async () => {
    if (!recoveryEmail || !recoveryEmail.includes("@")) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      // Save progress to server for cross-device recovery using funnel_analytics
      const { error } = await supabase.from("funnel_analytics").insert({
        session_id: sessionId,
        step_number: currentStep,
        step_name: "recovery_save",
        action: "save_for_recovery",
        metadata: {
          email: recoveryEmail,
          form_data: formData,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      if (error) throw error;

      // Send recovery email via edge function
      const { error: emailError } = await supabase.functions.invoke(
        "send-recovery-email",
        {
          body: {
            email: recoveryEmail,
            sessionId,
            step: currentStep,
          },
        }
      );

      if (emailError) throw emailError;

      toast({ title: "Recovery link sent to your email" });
      setShowRecoveryDialog(false);
    } catch (error) {
      console.error("Error sending recovery email:", error);
      toast({ title: "Failed to send recovery email", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Minimal save indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {status === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {status === "saved" && (
          <>
            <Check className="h-3 w-3 text-primary" />
            <span>Progress saved</span>
          </>
        )}
        {status === "error" && (
          <>
            <CloudOff className="h-3 w-3 text-destructive-foreground" />
            <span>Save failed</span>
          </>
        )}
        
        {currentStep > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setShowRecoveryDialog(true)}
          >
            <Mail className="h-3 w-3 mr-1" />
            Continue on another device
          </Button>
        )}
      </div>

      {/* Recovery Dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              Continue on Another Device
            </DialogTitle>
            <DialogDescription>
              We'll send you a link to continue your application on any device.
              Your progress will be saved for 7 days.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Email Address</Label>
              <Input
                id="recovery-email"
                type="email"
                placeholder="your@email.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-sm">
              <p className="text-muted-foreground">
                <strong>Current progress:</strong> Step {currentStep + 1} of 5
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRecoveryDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSendRecoveryLink} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Minimal cloud sync indicator
 */
export function CloudSyncIndicator({ isSynced }: { isSynced: boolean }) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {isSynced ? (
        <>
          <Cloud className="h-3 w-3 text-primary" />
          <span className="hidden sm:inline">Synced</span>
        </>
      ) : (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">Syncing</span>
        </>
      )}
    </div>
  );
}

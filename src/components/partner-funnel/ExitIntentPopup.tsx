import { useState, useEffect, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Shield, CheckCircle } from "lucide-react";

interface ExitIntentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onStay: () => void;
  currentStep: number;
  totalSteps: number;
}

export function ExitIntentPopup({
  isOpen,
  onClose,
  onStay,
  currentStep,
  totalSteps,
}: ExitIntentPopupProps) {
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);
  const isStepZero = currentStep === 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="glass max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {isStepZero ? "Before you go" : "Don't lose your progress"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            {isStepZero ? (
              <>
                <p>
                  This takes <span className="font-semibold text-primary">under 60 seconds</span>.
                  No fees, no obligation — just a conversation about your hiring needs.
                </p>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Under 60 seconds to complete</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>No contracts or upfront fees</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>Curated shortlist within 14 days</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p>
                  You're <span className="font-semibold text-primary">{progressPercent}%</span> through 
                  the application. Your progress is automatically saved.
                </p>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>Progress saved locally</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Your data is protected</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Only ~1 minute to complete</span>
                  </div>
                </div>
              </>
            )}

            <p className="text-xs text-muted-foreground/70 tracking-wide text-center">
              No obligation — just a conversation.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose} className="flex-1">
            Leave Anyway
          </AlertDialogCancel>
          <AlertDialogAction onClick={onStay} className="flex-1">
            {isStepZero ? "Get Started" : "Continue Application"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook to detect exit intent (mouse leaving viewport at top)
 */
export function useExitIntent(
  enabled: boolean = true,
  onExitIntent: () => void,
  threshold: number = 0
) {
  const [hasTriggered, setHasTriggered] = useState(false);

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      if (!enabled || hasTriggered) return;
      
      // Only trigger when leaving through the top of the viewport
      if (e.clientY <= threshold) {
        setHasTriggered(true);
        onExitIntent();
      }
    },
    [enabled, hasTriggered, threshold, onExitIntent]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [handleMouseLeave, enabled]);

  const reset = useCallback(() => {
    setHasTriggered(false);
  }, []);

  return { hasTriggered, reset };
}

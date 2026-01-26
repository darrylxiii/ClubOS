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
import { Badge } from "@/components/ui/badge";
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

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="glass-effect max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Don't Lose Your Progress!
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
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
                <span>Only ~2 minutes to complete</span>
              </div>
            </div>

            <Badge variant="secondary" className="w-full justify-center py-2">
              🔒 No-Cure-No-Pay • Zero Risk
            </Badge>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose} className="flex-1">
            Leave Anyway
          </AlertDialogCancel>
          <AlertDialogAction onClick={onStay} className="flex-1">
            Continue Application
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

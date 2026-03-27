import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);
  const isStepZero = currentStep === 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="glass max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {isStepZero ? "A moment before you leave" : "Your progress is saved"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            {isStepZero ? (
              <>
                <p>
                  This takes <span className="font-semibold text-primary">{t("less_than_two_minutes", "less than two minutes")}</span> — and there is no commitment involved.
                </p>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{t("under_two_minutes_to", "Under two minutes to complete")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>{t("no_contracts_required", "No contracts required")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>{t("shortlist_delivered_within_two", "Shortlist delivered within two weeks")}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p>
                  You are <span className="font-semibold text-primary">{progressPercent}%</span> through 
                  your brief. Your progress is automatically saved.
                </p>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>{t("your_progress_is_saved", "Your progress is saved")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>{t("data_encrypted_and_private", "Data encrypted and private")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{t("less_than_a_minute", "Less than a minute to finish")}</span>
                  </div>
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose} className="flex-1">
            Leave
          </AlertDialogCancel>
          <AlertDialogAction onClick={onStay} className="flex-1">
            {isStepZero ? "Get Started" : "Continue"}
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

/**
 * Progress Saver Component
 * Minimal save status indicator for the partner funnel.
 * Legacy "Continue on another device" dialog removed — replaced by DB-backed resume flow.
 */

import { useState, useEffect } from "react";
import { Cloud, CloudOff, Check, Loader2 } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ProgressSaverProps {
  sessionId: string;
  currentStep: number;
  formData: Record<string, unknown>;
  email?: string;
}

export function ProgressSaver({
  sessionId,
  currentStep,
  formData,
  email,
}: ProgressSaverProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Visual save indicator
  useEffect(() => {
    if (currentStep > 0) {
      setStatus("saving");
      const timer = setTimeout(() => setStatus("saved"), 500);
      return () => clearTimeout(timer);
    }
  }, [formData, currentStep]);

  return (
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
    </div>
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

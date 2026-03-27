/**
 * Unified Confirm Action Dialog
 * Supports multiple action types with consistent UX patterns
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertTriangle, Archive, Trash2, XCircle, RotateCcw, AlertCircle } from "lucide-react";

// ============= Types =============

export type ActionType = "delete" | "archive" | "cancel" | "restore" | "destructive" | "confirm";

interface ActionConfig {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  titleFallback: string;
  confirmTextKey: string;
  confirmTextFallback: string;
  className: string;
  iconClassName: string;
}

const actionConfigs: Record<ActionType, ActionConfig> = {
  delete: {
    icon: Trash2,
    titleKey: "actions.delete",
    titleFallback: "Delete",
    confirmTextKey: "actions.delete",
    confirmTextFallback: "Delete",
    className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    iconClassName: "text-destructive",
  },
  archive: {
    icon: Archive,
    titleKey: "actions.archive",
    titleFallback: "Archive",
    confirmTextKey: "actions.archive",
    confirmTextFallback: "Archive",
    className: "bg-muted text-muted-foreground hover:bg-muted/90",
    iconClassName: "text-muted-foreground",
  },
  cancel: {
    icon: XCircle,
    titleKey: "actions.cancel",
    titleFallback: "Cancel",
    confirmTextKey: "actions.cancel",
    confirmTextFallback: "Cancel",
    className: "bg-warning text-warning-foreground hover:bg-warning/90",
    iconClassName: "text-warning",
  },
  restore: {
    icon: RotateCcw,
    titleKey: "actions.restore",
    titleFallback: "Restore",
    confirmTextKey: "actions.restore",
    confirmTextFallback: "Restore",
    className: "bg-success text-success-foreground hover:bg-success/90",
    iconClassName: "text-success",
  },
  destructive: {
    icon: AlertTriangle,
    titleKey: "actions.confirm",
    titleFallback: "Confirm",
    confirmTextKey: "actions.confirm",
    confirmTextFallback: "Confirm",
    className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    iconClassName: "text-destructive",
  },
  confirm: {
    icon: AlertCircle,
    titleKey: "actions.confirm",
    titleFallback: "Confirm",
    confirmTextKey: "actions.continue",
    confirmTextFallback: "Continue",
    className: "",
    iconClassName: "text-primary",
  },
};

// ============= Props =============

export interface ConfirmActionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** The type of action (affects styling and defaults) */
  type?: ActionType;
  /** Custom title override */
  title?: string;
  /** Description text */
  description: string;
  /** Custom confirm button text */
  confirmText?: string;
  /** Custom cancel button text */
  cancelText?: string;
  /** Whether to require a reason input */
  requireReason?: boolean;
  /** Placeholder for reason input */
  reasonPlaceholder?: string;
  /** Label for reason input */
  reasonLabel?: string;
  /** Whether to require typing a confirmation phrase */
  requireTypeConfirm?: boolean;
  /** The phrase user must type to confirm (required if requireTypeConfirm is true) */
  confirmPhrase?: string;
  /** Instruction for type confirmation */
  typeConfirmInstruction?: string;
  /** Callback when action is confirmed */
  onConfirm: (reason?: string) => void | Promise<void>;
  /** Whether the action is currently loading */
  isLoading?: boolean;
  /** Additional content to display */
  children?: React.ReactNode;
}

// ============= Component =============

export function ConfirmActionDialog({
  open,
  onOpenChange,
  type = "confirm",
  title,
  description,
  confirmText,
  cancelText,
  requireReason = false,
  reasonPlaceholder,
  reasonLabel,
  requireTypeConfirm = false,
  confirmPhrase,
  typeConfirmInstruction,
  onConfirm,
  isLoading = false,
  children,
}: ConfirmActionDialogProps) {
  const { t } = useTranslation('common');
  const [reason, setReason] = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  const config = actionConfigs[type];
  const Icon = config.icon;

  const isConfirmDisabled = 
    isLoading || 
    localLoading ||
    (requireReason && !reason.trim()) ||
    (requireTypeConfirm && confirmPhrase && confirmInput !== confirmPhrase);

  const handleConfirm = useCallback(async () => {
    setLocalLoading(true);
    try {
      await onConfirm(requireReason ? reason : undefined);
      // Reset state on success
      setReason("");
      setConfirmInput("");
      onOpenChange(false);
    } catch (error) {
      console.error("Confirm action failed:", error);
    } finally {
      setLocalLoading(false);
    }
  }, [onConfirm, reason, requireReason, onOpenChange]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setReason("");
      setConfirmInput("");
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.iconClassName)} />
            {title || t(config.titleKey, config.titleFallback)}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {children}

          {requireReason && (
            <div className="space-y-2">
              <Label htmlFor="reason">{reasonLabel || t("dialog.reason", "Reason")}</Label>
              <Textarea
                id="reason"
                placeholder={reasonPlaceholder || t("dialog.enterReason", "Enter reason...")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
                disabled={isLoading || localLoading}
              />
            </div>
          )}

          {requireTypeConfirm && confirmPhrase && (
            <div className="space-y-2">
              <Label htmlFor="confirm-input" className="text-sm text-muted-foreground">
                {typeConfirmInstruction || t("dialog.typeToConfirm", "Type {{phrase}} to confirm", { phrase: confirmPhrase })}
              </Label>
              <Input
                id="confirm-input"
                placeholder={confirmPhrase}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                disabled={isLoading || localLoading}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading || localLoading}>
            {cancelText || t("actions.cancel", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={cn(config.className)}
          >
            {isLoading || localLoading ? t("actions.processing", "Processing...") : confirmText || t(config.confirmTextKey, config.confirmTextFallback)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============= Convenience Hooks =============

interface UseConfirmDialogOptions {
  type?: ActionType;
  title?: string;
  description: string;
  confirmText?: string;
  requireReason?: boolean;
  requireTypeConfirm?: boolean;
  confirmPhrase?: string;
}

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    options: UseConfirmDialogOptions | null;
    onConfirm: ((reason?: string) => void | Promise<void>) | null;
  }>({
    open: false,
    options: null,
    onConfirm: null,
  });

  const confirm = useCallback((
    options: UseConfirmDialogOptions,
    onConfirm: (reason?: string) => void | Promise<void>
  ) => {
    setDialogState({
      open: true,
      options,
      onConfirm,
    });
  }, []);

  const close = useCallback(() => {
    setDialogState((prev) => ({ ...prev, open: false }));
  }, []);

  const Dialog = useCallback(() => {
    if (!dialogState.options) return null;

    return (
      <ConfirmActionDialog
        open={dialogState.open}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        {...dialogState.options}
        onConfirm={async (reason) => {
          if (dialogState.onConfirm) {
            await dialogState.onConfirm(reason);
          }
          close();
        }}
      />
    );
  }, [dialogState, close]);

  return { confirm, close, Dialog };
}

export default ConfirmActionDialog;

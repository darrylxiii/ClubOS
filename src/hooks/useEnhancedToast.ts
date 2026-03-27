import { toast } from "sonner";
import { useCallback } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, Undo2 } from "lucide-react";

/**
 * Enhanced toast hook with consistent durations, undo actions, and better error handling
 *
 * Features:
 * - Consistent durations across the app
 * - Structured error messages (user-friendly, not raw)
 * - Undo actions for destructive operations
 * - Loading states for async operations
 * - Action buttons
 */

export interface ToastOptions {
  /** Custom duration in ms. Defaults: success=3000, error=5000, info=4000, warning=4000 */
  duration?: number;
  /** Show an action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Show an undo button (for destructive actions) */
  onUndo?: () => void | Promise<void>;
  /** Description text (secondary line) */
  description?: string;
  /** Prevent auto-dismiss */
  persistent?: boolean;
}

export interface LoadingToastOptions {
  /** Loading message */
  loading: string;
  /** Success message */
  success: string;
  /** Error message */
  error: string;
  /** Description for success state */
  successDescription?: string;
  /** Description for error state */
  errorDescription?: string;
}

/** Standard toast durations (in milliseconds) */
const DURATIONS = {
  success: 3000,
  error: 5000,
  info: 4000,
  warning: 4000,
  loading: Infinity, // Never auto-dismiss
  undo: 6000, // Longer for undo actions
} as const;

/** Common user-friendly error messages */
const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  "Failed to fetch": "Network error. Please check your connection.",
  "NetworkError": "Network error. Please check your connection.",
  "TypeError: Failed to fetch": "Network error. Please check your connection.",

  // Auth errors
  "Invalid login credentials": "Invalid email or password.",
  "Email not confirmed": "Please verify your email address.",
  "User not found": "Account not found.",
  "Invalid token": "Your session has expired. Please log in again.",

  // Permission errors
  "insufficient_permissions": "You don't have permission to do that.",
  "Forbidden": "You don't have permission to do that.",

  // Database errors
  "violates foreign key constraint": "This item is in use and cannot be deleted.",
  "duplicate key value": "This item already exists.",
  "violates unique constraint": "This item already exists.",

  // Rate limiting
  "Too many requests": "You're doing that too quickly. Please wait a moment.",

  // Generic
  "Internal server error": "Something went wrong. Please try again.",
  "Service unavailable": "Service temporarily unavailable. Please try again.",
};

/**
 * Get a user-friendly error message from an error object
 */
function getUserFriendlyError(error: unknown): string {
  if (!error) return "An unexpected error occurred.";

  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for known error patterns
  for (const [pattern, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.includes(pattern)) {
      return friendlyMessage;
    }
  }

  // Check for Supabase error codes
  if (typeof error === "object" && error !== null) {
    const err = error as any;
    if (err.code) {
      const codeMessage = ERROR_MESSAGES[err.code];
      if (codeMessage) return codeMessage;
    }
  }

  // If error message is technical (has special chars/codes), return generic message
  if (/[{}[\]<>]|Error:|Exception:|Stack:/.test(errorMessage)) {
    return "An unexpected error occurred. Please try again.";
  }

  // Return the error message if it seems user-friendly
  return errorMessage;
}

/**
 * Enhanced toast hook with consistent patterns
 */
export function useEnhancedToast() {
  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    const duration = options?.persistent ? Infinity : (options?.duration ?? DURATIONS.success);

    return toast.success(message, {
      duration,
      description: options?.description,
      icon: <CheckCircle2 className="h-5 w-5" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : options?.onUndo
        ? {
            label: "Undo",
            onClick: options.onUndo,
          }
        : undefined,
    });
  }, []);

  const showError = useCallback((error: unknown, options?: ToastOptions) => {
    const duration = options?.persistent ? Infinity : (options?.duration ?? DURATIONS.error);
    const message = getUserFriendlyError(error);

    return toast.error(message, {
      duration,
      description: options?.description,
      icon: <XCircle className="h-5 w-5" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  }, []);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    const duration = options?.persistent ? Infinity : (options?.duration ?? DURATIONS.info);

    return toast.info(message, {
      duration,
      description: options?.description,
      icon: <Info className="h-5 w-5" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  }, []);

  const showWarning = useCallback((message: string, options?: ToastOptions) => {
    const duration = options?.persistent ? Infinity : (options?.duration ?? DURATIONS.warning);

    return toast.warning(message, {
      duration,
      description: options?.description,
      icon: <AlertTriangle className="h-5 w-5" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  }, []);

  const showLoading = useCallback((message: string, options?: Pick<ToastOptions, "description">) => {
    return toast.loading(message, {
      duration: DURATIONS.loading,
      description: options?.description,
    });
  }, []);

  /**
   * Show a toast with undo functionality
   *
   * @example
   * showWithUndo("Item deleted", async () => {
   *   await restoreItem(id);
   * }, "The item has been permanently deleted");
   */
  const showWithUndo = useCallback((
    message: string,
    onUndo: () => void | Promise<void>,
    description?: string
  ) => {
    return toast.success(message, {
      duration: DURATIONS.undo,
      description,
      icon: <CheckCircle2 className="h-5 w-5" />,
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            await onUndo();
            toast.success("Action undone");
          } catch (error) {
            toast.error("Failed to undo action");
          }
        },
      },
    });
  }, []);

  /**
   * Promise-based toast for async operations
   * Automatically shows loading, success, or error states
   *
   * @example
   * await showPromise(deleteItem(id), {
   *   loading: "Deleting item...",
   *   success: "Item deleted",
   *   error: "Failed to delete item"
   * });
   */
  const showPromise = useCallback(async <T,>(
    promise: Promise<T>,
    options: LoadingToastOptions
  ): Promise<T> => {
    return toast.promise(promise, {
      loading: options.loading,
      success: (data) => ({
        title: options.success,
        description: options.successDescription,
        icon: <CheckCircle2 className="h-5 w-5" />,
        duration: DURATIONS.success,
      }),
      error: (error) => ({
        title: getUserFriendlyError(error),
        description: options.errorDescription,
        icon: <XCircle className="h-5 w-5" />,
        duration: DURATIONS.error,
      }),
    });
  }, []);

  /**
   * Dismiss a specific toast by ID
   */
  const dismiss = useCallback((toastId?: string | number) => {
    toast.dismiss(toastId);
  }, []);

  /**
   * Dismiss all toasts
   */
  const dismissAll = useCallback(() => {
    toast.dismiss();
  }, []);

  return {
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    loading: showLoading,
    withUndo: showWithUndo,
    promise: showPromise,
    dismiss,
    dismissAll,
  };
}

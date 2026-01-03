/**
 * Unified Notification System
 * Standardizes on Sonner for all toast notifications with consistent API
 */

import { toast as sonnerToast } from "sonner";

export interface NotifyOptions {
  /** Unique ID for the toast (for updates/dismissals) */
  id?: string;
  /** Duration in milliseconds (default: 4000) */
  duration?: number;
  /** Description text below the main message */
  description?: string;
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Unified notification API that wraps Sonner
 * Use this instead of importing toast directly for consistency
 */
export const notify = {
  /**
   * Show a success notification
   */
  success: (message: string, options?: NotifyOptions) => {
    return sonnerToast.success(message, options);
  },

  /**
   * Show an error notification
   */
  error: (message: string, options?: NotifyOptions) => {
    return sonnerToast.error(message, {
      duration: 5000, // Errors stay longer by default
      ...options,
    });
  },

  /**
   * Show a warning notification
   */
  warning: (message: string, options?: NotifyOptions) => {
    return sonnerToast.warning(message, options);
  },

  /**
   * Show an info notification
   */
  info: (message: string, options?: NotifyOptions) => {
    return sonnerToast.info(message, options);
  },

  /**
   * Show a loading notification (persists until dismissed)
   */
  loading: (message: string, options?: NotifyOptions) => {
    return sonnerToast.loading(message, {
      duration: Infinity,
      ...options,
    });
  },

  /**
   * Show a promise-based notification
   * Automatically shows loading, then success/error based on promise result
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },

  /**
   * Show a custom notification with JSX content
   */
  custom: (jsx: React.ReactElement, options?: NotifyOptions) => {
    return sonnerToast.custom(() => jsx, options);
  },

  /**
   * Dismiss a specific toast by ID, or all toasts if no ID provided
   */
  dismiss: (id?: string | number) => {
    sonnerToast.dismiss(id);
  },

  /**
   * Show a default notification (neutral styling)
   */
  message: (message: string, options?: NotifyOptions) => {
    return sonnerToast(message, options);
  },
};

// ============= Migration Helpers =============

/**
 * Helper to migrate from useToast (Radix) API to Sonner
 * Maps the object-based API to Sonner's method-based API
 * 
 * Usage:
 * Before: toast({ title: "Error", description: "Failed", variant: "destructive" })
 * After: migrateToast({ title: "Error", description: "Failed", variant: "destructive" })
 */
export function migrateToast(options: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}) {
  const message = options.title || options.description || "";
  const description = options.title && options.description ? options.description : undefined;

  if (options.variant === "destructive") {
    return notify.error(message, { description });
  }
  return notify.message(message, { description });
}

// Re-export for direct use where needed
export { sonnerToast as toast };

// Default export for cleaner imports
export default notify;

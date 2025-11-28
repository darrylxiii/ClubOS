import { toast } from 'sonner';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  toastTitle?: string;
  fallbackMessage?: string;
  logToConsole?: boolean;
  throwError?: boolean;
}

/**
 * Centralized error handling utility
 * Provides consistent error messaging and logging across the application
 */
export class ErrorHandler {
  /**
   * Handle and format errors with optional toast notification
   */
  static handle(
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): string {
    const {
      showToast = true,
      toastTitle = 'Error',
      fallbackMessage = 'An unexpected error occurred',
      logToConsole = true,
      throwError = false,
    } = options;

    const errorMessage = this.extractErrorMessage(error, fallbackMessage);

    if (logToConsole) {
      console.error(`[${toastTitle}]`, error);
    }

    if (showToast) {
      toast.error(toastTitle, {
        description: errorMessage,
      });
    }

    if (throwError) {
      throw error;
    }

    return errorMessage;
  }

  /**
   * Extract human-readable error message from various error types
   */
  static extractErrorMessage(error: unknown, fallback: string): string {
    if (!error) return fallback;

    // Supabase error
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return (error as { message: string }).message;
    }

    // String error
    if (typeof error === 'string') {
      return error;
    }

    // Error instance
    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  }

  /**
   * Handle Supabase query errors specifically
   */
  static handleSupabaseError(
    error: { message: string; code?: string } | null,
    context: string
  ): void {
    if (!error) return;

    const message = error.code
      ? `${context}: ${error.message} (${error.code})`
      : `${context}: ${error.message}`;

    this.handle(new Error(message), {
      toastTitle: 'Database Error',
      logToConsole: true,
    });
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: unknown): string {
    return this.handle(error, {
      toastTitle: 'Authentication Error',
      fallbackMessage: 'Failed to authenticate. Please try again.',
    });
  }

  /**
   * Handle network/API errors
   */
  static handleNetworkError(error: unknown): string {
    return this.handle(error, {
      toastTitle: 'Network Error',
      fallbackMessage: 'Failed to connect. Please check your internet connection.',
    });
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(error: unknown): string {
    return this.handle(error, {
      toastTitle: 'Validation Error',
      fallbackMessage: 'Please check your input and try again.',
    });
  }
}

/**
 * Async operation wrapper with automatic error handling and retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    onError?: (error: unknown, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, onError } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (onError) {
        onError(error, attempt);
      }

      if (attempt === retries) {
        throw error;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }

  throw new Error('Operation failed after retries');
}

/**
 * Safe async operation wrapper that never throws
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('Safe async operation failed:', error);
    return fallback;
  }
}

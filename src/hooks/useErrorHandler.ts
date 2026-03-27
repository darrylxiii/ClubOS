import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface ErrorHandlerOptions {
  /** Show toast notification on error */
  showToast?: boolean;
  /** Custom toast message (defaults to error.message) */
  toastMessage?: string;
  /** Log error to console */
  logToConsole?: boolean;
  /** Report error to monitoring service */
  reportToSentry?: boolean;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseErrorHandlerReturn {
  error: Error | null;
  hasError: boolean;
  setError: (error: Error | null) => void;
  clearError: () => void;
  handleError: (error: unknown, options?: ErrorHandlerOptions) => void;
}

/**
 * Hook for consistent error handling in data-fetching components
 *
 * @example
 * ```tsx
 * function DataComponent() {
 *   const [data, setData] = useState(null);
 *   const [loading, setLoading] = useState(true);
 *   const { error, handleError, clearError } = useErrorHandler();
 *
 *   const fetchData = async () => {
 *     try {
 *       setLoading(true);
 *       clearError();
 *       const result = await api.getData();
 *       setData(result);
 *     } catch (err) {
 *       handleError(err, { showToast: true });
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   if (loading) return <Skeleton />;
 *   if (error) return <ErrorState message={error.message} onRetry={fetchData} />;
 *   return <DataDisplay data={data} />;
 * }
 * ```
 */
export function useErrorHandler(defaultOptions: ErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((
    err: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const mergedOptions = { ...defaultOptions, ...options };

    // Convert unknown error to Error object
    const error = err instanceof Error
      ? err
      : new Error(String(err) || 'An unknown error occurred');

    // Store error in state
    setError(error);

    // Log to console (default: true in development)
    if (mergedOptions.logToConsole !== false && import.meta.env.DEV) {
      console.error('[useErrorHandler]', error);
    }

    // Show toast notification
    if (mergedOptions.showToast) {
      const message = mergedOptions.toastMessage || error.message || 'Something went wrong';
      toast.error(message);
    }

    // Report to Sentry
    if (mergedOptions.reportToSentry) {
      import('@sentry/react').then((Sentry) => {
        Sentry.captureException(error);
      }).catch(() => {});
    }

    // Custom error callback
    if (mergedOptions.onError) {
      mergedOptions.onError(error);
    }
  }, [defaultOptions]);

  return {
    error,
    hasError: error !== null,
    setError,
    clearError,
    handleError,
  };
}

/**
 * Helper to extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  // Supabase error format
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }

  // PostgreSQL error format
  if (error && typeof error === 'object' && 'error' in error) {
    const pgError = (error as any).error;
    if (typeof pgError === 'string') return pgError;
    if (pgError && 'message' in pgError) return pgError.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.name === 'NetworkError'
    );
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('auth') ||
      error.message.includes('unauthorized') ||
      error.message.includes('401') ||
      error.message.includes('403')
    );
  }
  return false;
}

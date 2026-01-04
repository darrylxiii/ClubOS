import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface AsyncActionOptions<T> {
  /** Message to show on success */
  successMessage?: string;
  /** Message to show on error (default: "Something went wrong") */
  errorMessage?: string;
  /** Callback for retry functionality */
  onRetry?: () => void;
  /** Number of automatic retries before failing */
  retryCount?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Show toast on success (default: true if successMessage provided) */
  showSuccessToast?: boolean;
  /** Show toast on error (default: true) */
  showErrorToast?: boolean;
}

interface AsyncActionState {
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for handling async actions with consistent error handling, retry logic, and toast notifications.
 * 
 * @example
 * ```tsx
 * const { execute, isLoading, error } = useAsyncAction();
 * 
 * const handleSubmit = async () => {
 *   await execute(
 *     () => api.submitForm(data),
 *     {
 *       successMessage: "Form submitted successfully",
 *       errorMessage: "Failed to submit form",
 *       onRetry: () => handleSubmit(),
 *     }
 *   );
 * };
 * ```
 */
export function useAsyncAction() {
  const [state, setState] = useState<AsyncActionState>({
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async <T>(
    fn: () => Promise<T>,
    options: AsyncActionOptions<T> = {}
  ): Promise<T | undefined> => {
    const {
      successMessage,
      errorMessage = "Something went wrong",
      onRetry,
      retryCount = 0,
      retryDelay = 1000,
      onSuccess,
      onError,
      showSuccessToast = !!successMessage,
      showErrorToast = true,
    } = options;

    setState({ isLoading: true, error: null });

    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts <= retryCount) {
      try {
        const result = await fn();
        
        setState({ isLoading: false, error: null });
        
        if (showSuccessToast && successMessage) {
          toast.success(successMessage);
        }
        
        onSuccess?.(result);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        attempts++;
        
        if (attempts <= retryCount) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // All attempts failed
    setState({ isLoading: false, error: lastError });
    
    if (showErrorToast) {
      toast.error(errorMessage, {
        description: lastError?.message,
        action: onRetry ? {
          label: "Retry",
          onClick: onRetry,
        } : undefined,
      });
    }
    
    onError?.(lastError!);
    return undefined;
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null });
  }, []);

  return {
    execute,
    reset,
    isLoading: state.isLoading,
    error: state.error,
  };
}

/**
 * Simplified version for one-off async calls with automatic retry button
 */
export function useRetryableAction<T>(
  action: () => Promise<T>,
  options: Omit<AsyncActionOptions<T>, 'onRetry'> = {}
) {
  const { execute, isLoading, error, reset } = useAsyncAction();
  
  const run = useCallback(() => {
    return execute(action, {
      ...options,
      onRetry: () => run(),
    });
  }, [execute, action, options]);

  return { run, isLoading, error, reset };
}

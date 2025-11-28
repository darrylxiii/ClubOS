import { useState, useCallback } from 'react';
import { ErrorHandler } from '@/utils/errorHandling';

interface UseAsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

interface AsyncOperationState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

/**
 * Hook for handling async operations with consistent loading/error/success states
 * Provides automatic error handling and toast notifications
 */
export function useAsyncOperation<T = void>(
  options: UseAsyncOperationOptions = {}
) {
  const [state, setState] = useState<AsyncOperationState>({
    loading: false,
    error: null,
    success: false,
  });

  const execute = useCallback(
    async (operation: () => Promise<T>): Promise<T | null> => {
      setState({ loading: true, error: null, success: false });

      try {
        const result = await operation();
        setState({ loading: false, error: null, success: true });

        if (options.showSuccessToast !== false && options.successMessage) {
          const { toast } = await import('sonner');
          toast.success(options.successMessage);
        }

        return result;
      } catch (error) {
        const errorMessage = ErrorHandler.handle(error, {
          showToast: options.showErrorToast !== false,
          toastTitle: 'Error',
          fallbackMessage: options.errorMessage || 'Operation failed',
          throwError: false,
        });

        setState({ loading: false, error: errorMessage, success: false });
        return null;
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, success: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

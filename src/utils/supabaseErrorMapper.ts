import { toast } from 'sonner';
import { standaloneErrorLogger } from '@/hooks/useErrorLogger';

/**
 * Supabase/Postgres Error Mapper
 * Transforms raw database errors into user-friendly messages
 * and provides automatic retry logic for transient errors
 */

interface PostgresError {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

interface MappedError {
  userMessage: string;
  technicalMessage: string;
  isRetryable: boolean;
  errorCategory: 'auth' | 'validation' | 'constraint' | 'permission' | 'network' | 'server' | 'unknown';
  suggestedAction?: string;
}

/**
 * Common Postgres error codes and their user-friendly mappings
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const POSTGRES_ERROR_MAP: Record<string, Partial<MappedError>> = {
  // Class 23 - Integrity Constraint Violation
  '23000': {
    userMessage: 'This operation would violate data integrity constraints.',
    errorCategory: 'constraint',
    isRetryable: false,
  },
  '23502': {
    userMessage: 'Required information is missing. Please fill in all required fields.',
    errorCategory: 'validation',
    isRetryable: false,
  },
  '23503': {
    userMessage: 'This item is referenced by other data and cannot be modified.',
    errorCategory: 'constraint',
    isRetryable: false,
  },
  '23505': {
    userMessage: 'This item already exists. Please use a different value.',
    errorCategory: 'constraint',
    isRetryable: false,
    suggestedAction: 'Try using a different email, name, or identifier.',
  },
  '23514': {
    userMessage: 'The provided data does not meet the required constraints.',
    errorCategory: 'validation',
    isRetryable: false,
  },

  // Class 42 - Syntax Error or Access Rule Violation
  '42501': {
    userMessage: 'You do not have permission to perform this action.',
    errorCategory: 'permission',
    isRetryable: false,
    suggestedAction: 'Please contact an administrator if you need access.',
  },
  '42P01': {
    userMessage: 'The requested resource could not be found.',
    errorCategory: 'server',
    isRetryable: false,
  },

  // Class 28 - Invalid Authorization
  '28000': {
    userMessage: 'Your session has expired. Please sign in again.',
    errorCategory: 'auth',
    isRetryable: false,
    suggestedAction: 'Click here to sign in.',
  },
  '28P01': {
    userMessage: 'Invalid credentials. Please check your email and password.',
    errorCategory: 'auth',
    isRetryable: false,
  },

  // Class 53 - Insufficient Resources
  '53000': {
    userMessage: 'The server is temporarily overloaded. Please try again.',
    errorCategory: 'server',
    isRetryable: true,
  },
  '53100': {
    userMessage: 'Server disk space is full. Please contact support.',
    errorCategory: 'server',
    isRetryable: false,
  },
  '53200': {
    userMessage: 'Server memory is exhausted. Please try again later.',
    errorCategory: 'server',
    isRetryable: true,
  },

  // Class 57 - Operator Intervention
  '57014': {
    userMessage: 'The operation took too long and was cancelled. Please try again.',
    errorCategory: 'server',
    isRetryable: true,
  },
  '57P01': {
    userMessage: 'Server is shutting down. Please try again in a moment.',
    errorCategory: 'server',
    isRetryable: true,
  },

  // Class 08 - Connection Exception
  '08000': {
    userMessage: 'Unable to connect to the server. Please check your internet connection.',
    errorCategory: 'network',
    isRetryable: true,
  },
  '08003': {
    userMessage: 'Connection to server was lost. Please refresh the page.',
    errorCategory: 'network',
    isRetryable: true,
  },
  '08006': {
    userMessage: 'Server connection failed. Please try again.',
    errorCategory: 'network',
    isRetryable: true,
  },

  // Supabase-specific codes
  'PGRST301': {
    userMessage: 'Your session has expired. Please sign in again.',
    errorCategory: 'auth',
    isRetryable: false,
  },
  'PGRST116': {
    userMessage: 'The requested item was not found.',
    errorCategory: 'validation',
    isRetryable: false,
  },
  'PGRST204': {
    userMessage: 'No items found matching your criteria.',
    errorCategory: 'validation',
    isRetryable: false,
  },
};

/**
 * RLS-specific error patterns
 */
const RLS_ERROR_PATTERNS = [
  { pattern: /row-level security/i, message: 'You do not have permission to access this data.' },
  { pattern: /policy.*denied/i, message: 'Access denied by security policy.' },
  { pattern: /insufficient.*privilege/i, message: 'You lack the required permissions.' },
];

/**
 * Map a Supabase/Postgres error to a user-friendly format.
 * Transforms technical error codes into readable messages and categorizes them.
 * @param error - The raw error object from Supabase/Postgres.
 * @returns MappedError object with user-facing and technical details.
 */
export function mapSupabaseError(error: unknown): MappedError {
  // Default error
  const defaultError: MappedError = {
    userMessage: 'An unexpected error occurred. Please try again.',
    technicalMessage: 'Unknown error',
    isRetryable: false,
    errorCategory: 'unknown',
  };

  if (!error) {
    return defaultError;
  }

  // Extract error details
  let errorCode: string | undefined;
  let errorMessage = '';

  if (typeof error === 'object' && error !== null) {
    const err = error as PostgresError;
    errorCode = err.code;
    errorMessage = err.message || '';

    // Check for nested error structure (Supabase format)
    if ('error' in error && typeof (error as any).error === 'object') {
      const nested = (error as any).error;
      errorCode = nested.code || errorCode;
      errorMessage = nested.message || errorMessage;
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Check for known error code
  if (errorCode && POSTGRES_ERROR_MAP[errorCode]) {
    const mapped = POSTGRES_ERROR_MAP[errorCode];
    return {
      userMessage: mapped.userMessage || defaultError.userMessage,
      technicalMessage: errorMessage,
      isRetryable: mapped.isRetryable ?? false,
      errorCategory: mapped.errorCategory || 'unknown',
      suggestedAction: mapped.suggestedAction,
    };
  }

  // Check for RLS errors
  for (const pattern of RLS_ERROR_PATTERNS) {
    if (pattern.pattern.test(errorMessage)) {
      return {
        userMessage: pattern.message,
        technicalMessage: errorMessage,
        isRetryable: false,
        errorCategory: 'permission',
        suggestedAction: 'If you believe this is an error, please contact support.',
      };
    }
  }

  // Check for network errors
  if (errorMessage.toLowerCase().includes('fetch') ||
    errorMessage.toLowerCase().includes('network') ||
    errorMessage.toLowerCase().includes('timeout')) {
    return {
      userMessage: 'Network error. Please check your connection and try again.',
      technicalMessage: errorMessage,
      isRetryable: true,
      errorCategory: 'network',
    };
  }

  // Check for auth errors
  if (errorMessage.toLowerCase().includes('jwt') ||
    errorMessage.toLowerCase().includes('token') ||
    errorMessage.toLowerCase().includes('expired') ||
    errorMessage.toLowerCase().includes('unauthorized')) {
    return {
      userMessage: 'Your session has expired. Please sign in again.',
      technicalMessage: errorMessage,
      isRetryable: false,
      errorCategory: 'auth',
      suggestedAction: 'Please refresh the page and sign in.',
    };
  }

  return {
    ...defaultError,
    technicalMessage: errorMessage || 'Unknown error',
  };
}

/**
 * Handle a Supabase error with automatic toast and logging.
 * Combines mapping, logging, and user notification in one call.
 * @param error - The raw error object.
 * @param options - Configuration including context, custom toast settings, etc.
 * @returns The mapped error object for further use if needed.
 */
export function handleSupabaseError(
  error: unknown,
  options?: {
    context?: string;
    componentName?: string;
    showToast?: boolean;
    toastTitle?: string;
  }
): MappedError {
  const mapped = mapSupabaseError(error);
  const { context, componentName, showToast = true, toastTitle } = options || {};

  // Log the error
  standaloneErrorLogger.error(
    context ? `${context}: ${mapped.technicalMessage}` : mapped.technicalMessage,
    error,
    {
      componentName: componentName || 'SupabaseErrorMapper',
      errorType: 'database',
      errorCategory: mapped.errorCategory,
      isRetryable: mapped.isRetryable,
    }
  );

  // Show toast notification
  if (showToast) {
    const title = toastTitle || (mapped.errorCategory === 'auth' ? 'Authentication Error' : 'Error');

    toast.error(title, {
      description: mapped.userMessage,
      action: mapped.suggestedAction ? {
        label: 'Learn More',
        onClick: () => console.log(mapped.suggestedAction),
      } : undefined,
    });
  }

  return mapped;
}

/**
 * Wrap a Supabase query with automatic error handling and retry logic.
 * Designed to replace `const { data, error } = await supabase...` calls with a robust wrapper.
 * @param operation - The async Supabase query function.
 * @param options - Retry settings and error handling options.
 * @returns Object containing data or MappedError.
 */
export async function withSupabaseErrorHandling<T>(
  operation: () => Promise<{ data: T | null; error: PostgresError | null }>,
  options?: {
    context?: string;
    componentName?: string;
    showToast?: boolean;
    retries?: number;
    retryDelay?: number;
  }
): Promise<{ data: T | null; error: MappedError | null }> {
  const { retries = 2, retryDelay = 1000, ...restOptions } = options || {};

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await operation();

      if (result.error) {
        const mapped = mapSupabaseError(result.error);

        // Retry if retryable and attempts remaining
        if (mapped.isRetryable && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }

        handleSupabaseError(result.error, restOptions);
        return { data: null, error: mapped };
      }

      return { data: result.data, error: null };
    } catch (_error) {
      lastError = error;

      const mapped = mapSupabaseError(error);

      // Retry if retryable and attempts remaining
      if (mapped.isRetryable && attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      handleSupabaseError(error, restOptions);
      return { data: null, error: mapped };
    }
  }

  // Should never reach here, but just in case
  const finalError = mapSupabaseError(lastError);
  return { data: null, error: finalError };
}

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

type ErrorType = 'react' | 'api' | 'edge_function' | 'database' | 'network' | 'unknown';
type Severity = 'info' | 'warning' | 'error' | 'critical';

interface ErrorContext {
  [key: string]: unknown;
}

interface UseErrorLoggerOptions {
  componentName: string;
  defaultErrorType?: ErrorType;
}

interface ErrorLoggerResult {
  logError: (message: string, error?: Error | unknown, context?: ErrorContext) => void;
  logWarning: (message: string, context?: ErrorContext) => void;
  logCritical: (message: string, error?: Error | unknown, context?: ErrorContext) => void;
  logApiError: (message: string, error?: Error | unknown, context?: ErrorContext) => void;
  logDatabaseError: (message: string, error?: Error | unknown, context?: ErrorContext) => void;
  logNetworkError: (message: string, error?: Error | unknown, context?: ErrorContext) => void;
}

/**
 * Enhanced error logging hook with automatic context capture
 * Provides type-safe error logging with user and session context
 * 
 * @example
 * const { logError, logApiError, logCritical } = useErrorLogger({ 
 *   componentName: 'MeetingRoom' 
 * });
 * 
 * try {
 *   await startMeeting();
 * } catch (error) {
 *   logError('Failed to start meeting', error, { meetingId });
 * }
 */
export function useErrorLogger(options: UseErrorLoggerOptions): ErrorLoggerResult {
  const { componentName, defaultErrorType = 'unknown' } = options;
  const { user, session } = useAuth();
  
  // Memoize base context to avoid recreating on every render
  const baseContext = useMemo(() => ({
    componentName,
    userId: user?.id,
    sessionId: session?.access_token?.slice(-8), // Last 8 chars for privacy
    pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
  }), [componentName, user?.id, session?.access_token]);
  
  /**
   * Log a general error
   */
  const logError = useCallback((
    message: string,
    error?: Error | unknown,
    context?: ErrorContext
  ) => {
    logger.error(message, error, {
      ...baseContext,
      errorType: defaultErrorType,
      severity: 'error' as Severity,
      ...context,
    });
  }, [baseContext, defaultErrorType]);
  
  /**
   * Log a warning (non-critical issue)
   */
  const logWarning = useCallback((
    message: string,
    context?: ErrorContext
  ) => {
    logger.warn(message, {
      ...baseContext,
      severity: 'warning' as Severity,
      ...context,
    });
  }, [baseContext]);
  
  /**
   * Log a critical error (requires immediate attention)
   */
  const logCritical = useCallback((
    message: string,
    error?: Error | unknown,
    context?: ErrorContext
  ) => {
    logger.critical(message, error, {
      ...baseContext,
      errorType: defaultErrorType,
      severity: 'critical' as Severity,
      ...context,
    });
  }, [baseContext, defaultErrorType]);
  
  /**
   * Log an API/Edge Function error
   */
  const logApiError = useCallback((
    message: string,
    error?: Error | unknown,
    context?: ErrorContext
  ) => {
    logger.error(message, error, {
      ...baseContext,
      errorType: 'api' as ErrorType,
      severity: 'error' as Severity,
      ...context,
    });
  }, [baseContext]);
  
  /**
   * Log a database error
   */
  const logDatabaseError = useCallback((
    message: string,
    error?: Error | unknown,
    context?: ErrorContext
  ) => {
    logger.error(message, error, {
      ...baseContext,
      errorType: 'database' as ErrorType,
      severity: 'error' as Severity,
      ...context,
    });
  }, [baseContext]);
  
  /**
   * Log a network error
   */
  const logNetworkError = useCallback((
    message: string,
    error?: Error | unknown,
    context?: ErrorContext
  ) => {
    logger.error(message, error, {
      ...baseContext,
      errorType: 'network' as ErrorType,
      severity: 'error' as Severity,
      ...context,
    });
  }, [baseContext]);
  
  return {
    logError,
    logWarning,
    logCritical,
    logApiError,
    logDatabaseError,
    logNetworkError,
  };
}

/**
 * Standalone error logger for use outside React components
 * Use this in utility functions, services, or non-React code
 * 
 * @example
 * import { standaloneErrorLogger } from '@/hooks/useErrorLogger';
 * 
 * standaloneErrorLogger.error('Service failed', error, {
 *   componentName: 'AuthService',
 *   errorType: 'api'
 * });
 */
export const standaloneErrorLogger = {
  error: (
    message: string, 
    error?: Error | unknown, 
    context?: ErrorContext & { componentName?: string; errorType?: ErrorType }
  ) => {
    logger.error(message, error, {
      errorType: context?.errorType || 'unknown',
      severity: 'error' as Severity,
      componentName: context?.componentName || 'Standalone',
      pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
      ...context,
    });
  },
  
  warning: (message: string, context?: ErrorContext & { componentName?: string }) => {
    logger.warn(message, {
      severity: 'warning' as Severity,
      componentName: context?.componentName || 'Standalone',
      pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
      ...context,
    });
  },
  
  critical: (
    message: string, 
    error?: Error | unknown, 
    context?: ErrorContext & { componentName?: string; errorType?: ErrorType }
  ) => {
    logger.critical(message, error, {
      errorType: context?.errorType || 'unknown',
      severity: 'critical' as Severity,
      componentName: context?.componentName || 'Standalone',
      pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
      ...context,
    });
  },
};

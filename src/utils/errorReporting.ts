/**
 * Centralized Error Reporting Utility
 * Logs errors to database for monitoring and alerting
 */

import { supabase } from "@/integrations/supabase/client";

export interface ErrorContext {
  componentStack?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  [key: string]: any;
}

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Log an error to the database for monitoring
 */
export const logErrorToDatabase = async (
  error: Error,
  severity: ErrorSeverity = 'error',
  componentName: string = 'Unknown',
  context?: ErrorContext
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log to console for now - error_logs table will be created in future migration
    console.error(`[${severity.toUpperCase()}] ${componentName}:`, error.message, {
      userId: user?.id,
      context,
      stack: error.stack,
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
};

/**
 * Log a critical error and create an alert
 */
export const logCriticalError = async (
  error: Error,
  componentName: string,
  context?: ErrorContext
): Promise<void> => {
  await logErrorToDatabase(error, 'critical', componentName, context);
  
  // Critical errors should also be logged to console
  console.error(`🔴 CRITICAL ERROR in ${componentName}:`, error);
};

/**
 * Log a network error
 */
export const logNetworkError = async (
  error: Error,
  endpoint: string,
  statusCode?: number
): Promise<void> => {
  await logErrorToDatabase(error, 'error', 'NetworkRequest', {
    endpoint,
    statusCode,
    errorType: 'network',
  });
};

/**
 * Log an authentication error
 */
export const logAuthError = async (
  error: Error,
  authAction: string
): Promise<void> => {
  await logErrorToDatabase(error, 'error', 'Authentication', {
    authAction,
    errorType: 'auth',
  });
};

import { logger } from '@/lib/logger';

/**
 * Global Error Handlers
 * Captures uncaught exceptions and unhandled promise rejections
 * Initializes before React renders to catch all errors
 */

let isInitialized = false;

interface ErrorContext {
  source: 'window.onerror' | 'unhandledrejection' | 'react-error-boundary';
  url?: string;
  line?: number;
  column?: number;
  timestamp: string;
}

/**
 * Extract meaningful error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

/**
 * Extract stack trace from various error types
 */
function extractStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  if (error && typeof error === 'object' && 'stack' in error) {
    return String((error as { stack: unknown }).stack);
  }
  return undefined;
}

/**
 * Check if error is from a browser extension (ignore these)
 */
function isExtensionError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  const stack = extractStack(error)?.toLowerCase() || '';
  
  const extensionPatterns = [
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    'extensions:',
    'inpage.js',
    'contentscript',
  ];
  
  return extensionPatterns.some(pattern => 
    message.includes(pattern) || stack.includes(pattern)
  );
}

/**
 * Check if error should be ignored (noise reduction)
 */
function shouldIgnoreError(error: unknown): boolean {
  // Ignore browser extension errors
  if (isExtensionError(error)) {
    return true;
  }
  
  const message = extractErrorMessage(error).toLowerCase();
  
  // Ignore common non-actionable errors
  const ignoredPatterns = [
    'resizeobserver loop',
    'script error',
    'loading chunk',
    'dynamically imported module',
    'network error',
    'failed to fetch', // Will be handled by network error handler
    'cancelled',
    'aborted',
  ];
  
  return ignoredPatterns.some(pattern => message.includes(pattern));
}

/**
 * Handle window.onerror - catches uncaught exceptions
 */
function handleWindowError(
  message: string | Event,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error
): boolean {
  // If it's an Event, extract error info
  const errorMessage = typeof message === 'string' ? message : 'Unknown error event';
  const actualError = error || new Error(errorMessage);
  
  if (shouldIgnoreError(actualError)) {
    return false;
  }
  
  const context: ErrorContext = {
    source: 'window.onerror',
    url: source,
    line: lineno,
    column: colno,
    timestamp: new Date().toISOString(),
  };
  
  logger.error('Uncaught Exception', actualError, {
    errorType: 'unknown',
    severity: 'error',
    componentName: 'GlobalErrorHandler',
    ...context,
  });
  
  // Return false to allow default browser error handling
  return false;
}

/**
 * Handle unhandledrejection - catches unhandled promise rejections
 */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const error = event.reason;
  
  if (shouldIgnoreError(error)) {
    return;
  }
  
  const context: ErrorContext = {
    source: 'unhandledrejection',
    timestamp: new Date().toISOString(),
  };
  
  // Determine severity based on error type
  const isNetworkError = error instanceof TypeError && 
    extractErrorMessage(error).toLowerCase().includes('fetch');
  
  logger.error('Unhandled Promise Rejection', error, {
    errorType: isNetworkError ? 'network' : 'unknown',
    severity: 'error',
    componentName: 'GlobalErrorHandler',
    promiseReason: typeof error === 'object' ? JSON.stringify(error) : String(error),
    ...context,
  });
}

/**
 * Handle React errors that bubble up (additional safety net)
 */
function handleReactError(event: ErrorEvent): void {
  // Only handle if it looks like a React error
  const stack = event.error?.stack || '';
  if (!stack.includes('react') && !stack.includes('React')) {
    return;
  }
  
  if (shouldIgnoreError(event.error)) {
    return;
  }
  
  const context: ErrorContext = {
    source: 'react-error-boundary',
    url: event.filename,
    line: event.lineno,
    column: event.colno,
    timestamp: new Date().toISOString(),
  };
  
  logger.error('React Runtime Error', event.error, {
    errorType: 'react',
    severity: 'error',
    componentName: 'GlobalErrorHandler',
    ...context,
  });
}

/**
 * Initialize global error handlers
 * Call this in main.tsx before React renders
 */
export function initializeGlobalErrorHandlers(): void {
  if (isInitialized) {
    console.warn('[GlobalErrorHandlers] Already initialized');
    return;
  }
  
  // Attach window.onerror
  window.onerror = handleWindowError;
  
  // Attach unhandledrejection handler
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  
  // Attach error event listener for React errors
  window.addEventListener('error', handleReactError);
  
  isInitialized = true;
  console.log('[GlobalErrorHandlers] ✅ Initialized');
}

/**
 * Cleanup global error handlers (for testing)
 */
export function cleanupGlobalErrorHandlers(): void {
  window.onerror = null;
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  window.removeEventListener('error', handleReactError);
  isInitialized = false;
}

/**
 * Manually report an error to the global handler
 * Useful for caught errors that should still be logged
 */
export function reportError(
  error: Error | unknown,
  context?: {
    componentName?: string;
    errorType?: 'react' | 'api' | 'edge_function' | 'database' | 'network' | 'unknown';
    severity?: 'info' | 'warning' | 'error' | 'critical';
    metadata?: Record<string, unknown>;
  }
): void {
  if (shouldIgnoreError(error)) {
    return;
  }
  
  logger.error('Reported Error', error, {
    errorType: context?.errorType || 'unknown',
    severity: context?.severity || 'error',
    componentName: context?.componentName || 'ManualReport',
    ...context?.metadata,
  });
}

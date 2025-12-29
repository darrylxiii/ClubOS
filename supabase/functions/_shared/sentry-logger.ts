/**
 * Sentry-Compatible Edge Function Logger
 * Formats logs in a structured format for Sentry ingestion and debugging
 */

interface SentryLogPayload {
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  message: string;
  timestamp: string;
  extra: Record<string, unknown>;
  tags: Record<string, string>;
}

/**
 * Creates a Sentry-compatible logger for edge functions
 */
export function createSentryLogger(functionName: string) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  const formatLog = (
    level: SentryLogPayload['level'], 
    message: string, 
    extra?: Record<string, unknown>
  ): string => {
    const payload: SentryLogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      extra: {
        requestId,
        functionName,
        elapsedMs: Date.now() - startTime,
        ...extra,
      },
      tags: {
        function: functionName,
        environment: Deno.env.get('ENVIRONMENT') || 'production',
      },
    };
    return JSON.stringify(payload);
  };

  return {
    requestId,
    
    /**
     * Log info-level message
     */
    info: (message: string, extra?: Record<string, unknown>) => {
      console.log(formatLog('info', message, extra));
    },
    
    /**
     * Log warning-level message
     */
    warn: (message: string, extra?: Record<string, unknown>) => {
      console.warn(formatLog('warning', message, extra));
    },
    
    /**
     * Log error with optional Error object
     */
    error: (message: string, error?: Error | unknown, extra?: Record<string, unknown>) => {
      const errorExtra = error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : { errorDetails: String(error) };
      console.error(formatLog('error', message, { ...errorExtra, ...extra }));
    },
    
    /**
     * Log fatal error (critical failure)
     */
    fatal: (message: string, error?: Error | unknown, extra?: Record<string, unknown>) => {
      const errorExtra = error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : { errorDetails: String(error) };
      console.error(formatLog('fatal', message, { ...errorExtra, ...extra }));
    },
    
    /**
     * Log debug-level message
     */
    debug: (message: string, extra?: Record<string, unknown>) => {
      console.log(formatLog('debug', message, extra));
    },
    
    /**
     * Add a performance checkpoint
     */
    checkpoint: (name: string) => {
      console.log(formatLog('debug', `Checkpoint: ${name}`, { checkpoint: name }));
    },
    
    /**
     * Log successful request completion with timing
     */
    complete: (statusCode: number = 200, extra?: Record<string, unknown>) => {
      console.log(formatLog('info', 'Request completed', { 
        statusCode, 
        totalTimeMs: Date.now() - startTime,
        ...extra 
      }));
    },
    
    /**
     * Log external API call
     */
    externalCall: (service: string, endpoint: string, statusCode?: number, durationMs?: number) => {
      console.log(formatLog('info', `External API call: ${service}`, {
        service,
        endpoint,
        statusCode,
        durationMs,
      }));
    },
    
    /**
     * Get elapsed time in milliseconds
     */
    getElapsedMs: (): number => {
      return Date.now() - startTime;
    },
  };
}

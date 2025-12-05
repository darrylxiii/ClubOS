/**
 * Standardized Function Logger
 * Phase 3: Comprehensive logging for all edge functions
 */

export interface LogContext {
  functionName: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  startTime: number;
  checkpoints: { name: string; time: number }[];
}

/**
 * Creates a scoped logger for an edge function
 */
export function createFunctionLogger(functionName: string) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  const checkpoints: { name: string; time: number }[] = [];

  return {
    requestId,
    
    /**
     * Log request start
     */
    logRequest(method: string, userId?: string, metadata?: Record<string, unknown>) {
      console.log(JSON.stringify({
        level: 'info',
        function: functionName,
        requestId,
        event: 'request_start',
        method,
        userId,
        timestamp: new Date().toISOString(),
        ...metadata,
      }));
    },

    /**
     * Log info message
     */
    info(message: string, metadata?: Record<string, unknown>) {
      console.log(JSON.stringify({
        level: 'info',
        function: functionName,
        requestId,
        message,
        elapsedMs: Date.now() - startTime,
        ...metadata,
      }));
    },

    /**
     * Log warning message
     */
    warn(message: string, metadata?: Record<string, unknown>) {
      console.warn(JSON.stringify({
        level: 'warn',
        function: functionName,
        requestId,
        message,
        elapsedMs: Date.now() - startTime,
        ...metadata,
      }));
    },

    /**
     * Log error message
     */
    error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>) {
      const errorDetails = error instanceof Error 
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : { errorDetails: String(error) };
      
      console.error(JSON.stringify({
        level: 'error',
        function: functionName,
        requestId,
        message,
        elapsedMs: Date.now() - startTime,
        ...errorDetails,
        ...metadata,
      }));
    },

    /**
     * Add performance checkpoint
     */
    checkpoint(name: string) {
      const time = Date.now() - startTime;
      checkpoints.push({ name, time });
      console.log(JSON.stringify({
        level: 'debug',
        function: functionName,
        requestId,
        event: 'checkpoint',
        checkpoint: name,
        elapsedMs: time,
      }));
    },

    /**
     * Log successful response
     */
    logSuccess(statusCode: number = 200, metadata?: Record<string, unknown>) {
      const totalTime = Date.now() - startTime;
      console.log(JSON.stringify({
        level: 'info',
        function: functionName,
        requestId,
        event: 'request_complete',
        statusCode,
        totalTimeMs: totalTime,
        checkpoints,
        ...metadata,
      }));
    },

    /**
     * Log error response
     */
    logError(statusCode: number, errorMessage: string, metadata?: Record<string, unknown>) {
      const totalTime = Date.now() - startTime;
      console.error(JSON.stringify({
        level: 'error',
        function: functionName,
        requestId,
        event: 'request_error',
        statusCode,
        errorMessage,
        totalTimeMs: totalTime,
        checkpoints,
        ...metadata,
      }));
    },

    /**
     * Log rate limit hit
     */
    logRateLimit(identifier: string) {
      console.warn(JSON.stringify({
        level: 'warn',
        function: functionName,
        requestId,
        event: 'rate_limit_exceeded',
        identifier,
        timestamp: new Date().toISOString(),
      }));
    },

    /**
     * Log external API call
     */
    logExternalCall(service: string, endpoint: string, statusCode?: number, durationMs?: number) {
      console.log(JSON.stringify({
        level: 'info',
        function: functionName,
        requestId,
        event: 'external_api_call',
        service,
        endpoint,
        statusCode,
        durationMs,
      }));
    },

    /**
     * Get elapsed time
     */
    getElapsedMs(): number {
      return Date.now() - startTime;
    },
  };
}

/**
 * Extract client info from request headers
 */
export function getClientInfo(req: Request) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
        req.headers.get('x-real-ip') || 
        'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    origin: req.headers.get('origin') || 'unknown',
  };
}

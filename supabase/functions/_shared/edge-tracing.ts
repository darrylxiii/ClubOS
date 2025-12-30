/**
 * Edge Function Tracing Middleware
 * Distributed tracing support for Supabase Edge Functions
 */

// Trace context storage
interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  name: string;
  attributes: Record<string, unknown>;
}

const activeSpans: Map<string, TraceContext> = new Map();

/**
 * Generate a random trace ID (32 hex chars)
 */
export function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random span ID (16 hex chars)
 */
export function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse trace context from incoming request headers
 */
export function parseTraceContext(headers: Headers): {
  traceId: string;
  parentSpanId?: string;
} {
  const traceparent = headers.get('traceparent');
  
  if (traceparent) {
    // W3C Trace Context format: version-traceId-parentId-flags
    const parts = traceparent.split('-');
    if (parts.length >= 3) {
      return {
        traceId: parts[1],
        parentSpanId: parts[2],
      };
    }
  }

  // Check custom headers
  const customTraceId = headers.get('x-trace-id');
  const customSpanId = headers.get('x-span-id');

  if (customTraceId) {
    return {
      traceId: customTraceId,
      parentSpanId: customSpanId || undefined,
    };
  }

  // Generate new trace ID if none provided
  return {
    traceId: generateTraceId(),
  };
}

/**
 * Start a new span
 */
export function startSpan(
  name: string,
  options: {
    traceId?: string;
    parentSpanId?: string;
    attributes?: Record<string, unknown>;
  } = {}
): TraceContext {
  const spanId = generateSpanId();
  const traceId = options.traceId || generateTraceId();
  
  const context: TraceContext = {
    traceId,
    spanId,
    parentSpanId: options.parentSpanId,
    startTime: Date.now(),
    name,
    attributes: options.attributes || {},
  };

  activeSpans.set(spanId, context);
  
  console.log(`[TRACE] Start span: ${name}`, {
    traceId,
    spanId,
    parentSpanId: options.parentSpanId,
    attributes: options.attributes,
  });

  return context;
}

/**
 * End a span and log timing
 */
export function endSpan(
  spanId: string,
  status: 'OK' | 'ERROR' = 'OK',
  error?: Error
): void {
  const context = activeSpans.get(spanId);
  if (!context) return;

  const duration = Date.now() - context.startTime;
  
  console.log(`[TRACE] End span: ${context.name}`, {
    traceId: context.traceId,
    spanId,
    duration: `${duration}ms`,
    status,
    error: error?.message,
  });

  activeSpans.delete(spanId);
}

/**
 * Add attributes to an active span
 */
export function setSpanAttribute(spanId: string, key: string, value: unknown): void {
  const context = activeSpans.get(spanId);
  if (context) {
    context.attributes[key] = value;
  }
}

/**
 * Create trace headers for outgoing requests
 */
export function createTraceHeaders(context: TraceContext): Record<string, string> {
  return {
    'traceparent': `00-${context.traceId}-${context.spanId}-01`,
    'x-trace-id': context.traceId,
    'x-span-id': context.spanId,
  };
}

/**
 * Middleware to wrap edge function handlers with tracing
 */
export function withTracing<T extends (req: Request) => Promise<Response>>(
  handler: T,
  options: {
    name: string;
    attributes?: Record<string, unknown>;
  }
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const { traceId, parentSpanId } = parseTraceContext(req.headers);
    
    const span = startSpan(options.name, {
      traceId,
      parentSpanId,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.user_agent': req.headers.get('user-agent') || 'unknown',
        ...options.attributes,
      },
    });

    try {
      const response = await handler(req);
      
      setSpanAttribute(span.spanId, 'http.status_code', response.status);
      endSpan(span.spanId, response.ok ? 'OK' : 'ERROR');
      
      // Add trace headers to response
      const headers = new Headers(response.headers);
      headers.set('x-trace-id', span.traceId);
      headers.set('x-span-id', span.spanId);
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      setSpanAttribute(span.spanId, 'error', true);
      setSpanAttribute(span.spanId, 'error.message', (error as Error).message);
      endSpan(span.spanId, 'ERROR', error as Error);
      throw error;
    }
  };
}

/**
 * Create a child span for sub-operations
 */
export function createChildSpan(
  parent: TraceContext,
  name: string,
  attributes?: Record<string, unknown>
): TraceContext {
  return startSpan(name, {
    traceId: parent.traceId,
    parentSpanId: parent.spanId,
    attributes,
  });
}

/**
 * Log a trace event (for lightweight logging without spans)
 */
export function traceEvent(
  traceId: string,
  name: string,
  attributes?: Record<string, unknown>
): void {
  console.log(`[TRACE] Event: ${name}`, {
    traceId,
    timestamp: Date.now(),
    attributes,
  });
}

/**
 * Structured trace log for observability tools
 */
export function traceLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  context?: TraceContext,
  data?: Record<string, unknown>
): void {
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && {
      traceId: context.traceId,
      spanId: context.spanId,
    }),
    ...data,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'debug':
      console.debug(JSON.stringify(logEntry));
      break;
    default:
      console.log(JSON.stringify(logEntry));
  }
}

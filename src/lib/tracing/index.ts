/**
 * OpenTelemetry Tracing - World-Class Distributed Tracing
 * Provides end-to-end request tracing across frontend and edge functions
 * 
 * Phase 8: Dynamic imports - Only loads ~80KB of OpenTelemetry packages in development
 */

import { context, trace, SpanStatusCode, Span, SpanKind } from '@opentelemetry/api';

// Configuration
const SERVICE_NAME = 'quantum-club-frontend';
const SERVICE_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const ENVIRONMENT = import.meta.env.MODE || 'development';

// Trace storage for waterfall visualization
interface TraceEntry {
  traceId: string;
  spanId: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  attributes: Record<string, unknown>;
  parentSpanId?: string;
}

class TraceStore {
  private traces: Map<string, TraceEntry[]> = new Map();
  private maxTraces = 100;

  addTrace(entry: TraceEntry): void {
    const entries = this.traces.get(entry.traceId) || [];
    entries.push(entry);
    this.traces.set(entry.traceId, entries);

    // Cleanup old traces
    if (this.traces.size > this.maxTraces) {
      const firstKey = this.traces.keys().next().value;
      if (firstKey) this.traces.delete(firstKey);
    }
  }

  updateTrace(traceId: string, spanId: string, updates: Partial<TraceEntry>): void {
    const entries = this.traces.get(traceId);
    if (entries) {
      const entry = entries.find(e => e.spanId === spanId);
      if (entry) {
        Object.assign(entry, updates);
      }
    }
  }

  getTrace(traceId: string): TraceEntry[] | undefined {
    return this.traces.get(traceId);
  }

  getAllTraces(): Map<string, TraceEntry[]> {
    return new Map(this.traces);
  }

  getRecentTraces(limit = 20): TraceEntry[][] {
    const entries = Array.from(this.traces.values());
    return entries.slice(-limit);
  }

  clear(): void {
    this.traces.clear();
  }
}

export const traceStore = new TraceStore();

// Provider instance - dynamically loaded
let provider: unknown = null;
let isInitialized = false;

// Lazy load OpenTelemetry packages (~80KB deferred until development mode requires tracing)
async function loadOpenTelemetryModules() {
  const [
    { WebTracerProvider },
    { SimpleSpanProcessor },
    { OTLPTraceExporter },
    { ZoneContextManager },
    { FetchInstrumentation },
    { DocumentLoadInstrumentation },
    { resourceFromAttributes },
    { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION },
    { registerInstrumentations }
  ] = await Promise.all([
    import('@opentelemetry/sdk-trace-web'),
    import('@opentelemetry/sdk-trace-base'),
    import('@opentelemetry/exporter-trace-otlp-http'),
    import('@opentelemetry/context-zone'),
    import('@opentelemetry/instrumentation-fetch'),
    import('@opentelemetry/instrumentation-document-load'),
    import('@opentelemetry/resources'),
    import('@opentelemetry/semantic-conventions'),
    import('@opentelemetry/instrumentation')
  ]);

  return {
    WebTracerProvider,
    SimpleSpanProcessor,
    OTLPTraceExporter,
    ZoneContextManager,
    FetchInstrumentation,
    DocumentLoadInstrumentation,
    resourceFromAttributes,
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
    registerInstrumentations
  };
}

/**
 * Initialize OpenTelemetry tracing
 * Only loads packages in development mode
 */
export async function initializeTracing(): Promise<void> {
  if (isInitialized || typeof window === 'undefined') {
    return;
  }

  // Skip in production to save ~80KB
  if (!import.meta.env.DEV) {
    console.log('[Tracing] Disabled in production for bundle optimization');
    isInitialized = true;
    return;
  }

  try {
    // Dynamically load all OpenTelemetry packages
    const {
      WebTracerProvider,
      SimpleSpanProcessor,
      OTLPTraceExporter,
      ZoneContextManager,
      FetchInstrumentation,
      DocumentLoadInstrumentation,
      resourceFromAttributes,
      ATTR_SERVICE_NAME,
      ATTR_SERVICE_VERSION,
      registerInstrumentations
    } = await loadOpenTelemetryModules();

    // Create resource with service attributes
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
      'deployment.environment': ENVIRONMENT,
    });

    // Configure exporter (console for now, can be replaced with OTLP endpoint)
    const exporter = new OTLPTraceExporter({
      url: import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || '/api/traces',
      headers: {},
    });

    // Create provider with resource and span processor
    provider = new WebTracerProvider({
      resource,
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });

    // Configure context manager and register
    (provider as any).register({
      contextManager: new ZoneContextManager(),
    });

    // Register instrumentations
    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: [
            // Allow trace propagation to Supabase edge functions
            /https:\/\/.*\.supabase\.co\/.*/,
            /https:\/\/.*\.supabase\.in\/.*/,
            /https:\/\/dpjucecmoyfzrduhlctt\.supabase\.co\/.*/,
          ],
          clearTimingResources: true,
          applyCustomAttributesOnSpan: (span, request) => {
            // Add custom attributes
            if (request instanceof Request) {
              span.setAttribute('http.url', request.url);
              span.setAttribute('http.method', request.method);
              
              // Store in trace store
              const spanContext = span.spanContext();
              traceStore.addTrace({
                traceId: spanContext.traceId,
                spanId: spanContext.spanId,
                name: `${request.method} ${new URL(request.url).pathname}`,
                startTime: Date.now(),
                status: 'pending',
                attributes: {
                  url: request.url,
                  method: request.method,
                },
              });
            }
          },
        }),
        new DocumentLoadInstrumentation(),
      ],
    });

    isInitialized = true;
    console.log('[Tracing] OpenTelemetry initialized successfully');
  } catch (error) {
    console.error('[Tracing] Failed to initialize OpenTelemetry:', error);
  }
}

/**
 * Get the tracer instance
 */
export function getTracer(name = SERVICE_NAME) {
  if (!isInitialized) {
    // Non-blocking initialization
    initializeTracing();
  }
  return trace.getTracer(name, SERVICE_VERSION);
}

/**
 * Create a span for an operation
 */
export function createSpan(
  name: string,
  options?: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean>;
    parentSpan?: Span;
  }
): Span {
  const tracer = getTracer();
  
  const spanOptions = {
    kind: options?.kind || SpanKind.INTERNAL,
    attributes: options?.attributes,
  };

  if (options?.parentSpan) {
    const ctx = trace.setSpan(context.active(), options.parentSpan);
    return tracer.startSpan(name, spanOptions, ctx);
  }

  return tracer.startSpan(name, spanOptions);
}

/**
 * Execute a function within a traced span
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean>;
  }
): Promise<T> {
  const span = createSpan(name, options);
  const startTime = Date.now();
  const spanContext = span.spanContext();

  // Add to trace store
  traceStore.addTrace({
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    name,
    startTime,
    status: 'pending',
    attributes: options?.attributes || {},
  });

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    
    span.setStatus({ code: SpanStatusCode.OK });
    
    const endTime = Date.now();
    traceStore.updateTrace(spanContext.traceId, spanContext.spanId, {
      endTime,
      duration: endTime - startTime,
      status: 'success',
    });

    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);

    const endTime = Date.now();
    traceStore.updateTrace(spanContext.traceId, spanContext.spanId, {
      endTime,
      duration: endTime - startTime,
      status: 'error',
    });

    throw error;
  } finally {
    span.end();
  }
}

/**
 * Trace a React component render
 */
export function traceComponent(componentName: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    
    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const span = createSpan(`render:${componentName}`, {
        kind: SpanKind.INTERNAL,
        attributes: { component: componentName },
      });
      
      try {
        const result = originalMethod.apply(this, args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    } as T;
    
    return descriptor;
  };
}

/**
 * Create trace headers for propagation to edge functions
 */
export function getTraceHeaders(): Record<string, string> {
  const currentSpan = trace.getActiveSpan();
  if (!currentSpan) {
    return {};
  }

  const spanContext = currentSpan.spanContext();
  return {
    'traceparent': `00-${spanContext.traceId}-${spanContext.spanId}-01`,
    'x-trace-id': spanContext.traceId,
    'x-span-id': spanContext.spanId,
  };
}

/**
 * Parse trace context from incoming request
 */
export function parseTraceContext(headers: Headers): { traceId: string; parentSpanId: string } | null {
  const traceparent = headers.get('traceparent');
  if (!traceparent) {
    return null;
  }

  const parts = traceparent.split('-');
  if (parts.length >= 3) {
    return {
      traceId: parts[1],
      parentSpanId: parts[2],
    };
  }

  return null;
}

// Export types
export type { TraceEntry };
export { SpanKind, SpanStatusCode };

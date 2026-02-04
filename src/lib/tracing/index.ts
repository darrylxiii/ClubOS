/**
 * Tracing Module - No-op Implementation
 * OpenTelemetry removed to reduce build memory usage.
 * This provides stub functions to maintain API compatibility.
 */

// Trace storage for waterfall visualization (kept for compatibility)
export interface TraceEntry {
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

// Mock span interface
interface MockSpan {
  spanContext: () => { traceId: string; spanId: string };
  setAttribute: (key: string, value: unknown) => MockSpan;
  setStatus: (status: { code: number; message?: string }) => MockSpan;
  recordException: (error: Error) => MockSpan;
  end: () => void;
}

// Generate random IDs for compatibility
const generateId = (length: number): string => {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

// Create a mock span
const createMockSpan = (name: string): MockSpan => {
  const traceId = generateId(32);
  const spanId = generateId(16);
  
  return {
    spanContext: () => ({ traceId, spanId }),
    setAttribute: function() { return this; },
    setStatus: function() { return this; },
    recordException: function() { return this; },
    end: () => {},
  };
};

// TraceStore stub
class TraceStore {
  private traces: Map<string, TraceEntry[]> = new Map();
  
  addTrace(entry: TraceEntry): void {
    const entries = this.traces.get(entry.traceId) || [];
    entries.push(entry);
    this.traces.set(entry.traceId, entries);
    
    // Cleanup old traces (keep max 50)
    if (this.traces.size > 50) {
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

/**
 * Initialize tracing (no-op)
 */
export function initializeTracing(): void {
  // No-op - tracing disabled
}

/**
 * Get tracer instance (no-op)
 */
export function getTracer(_name?: string) {
  return {
    startSpan: createMockSpan,
  };
}

/**
 * Create a span (returns mock span)
 */
export function createSpan(
  name: string,
  _options?: {
    kind?: number;
    attributes?: Record<string, string | number | boolean>;
    parentSpan?: MockSpan;
  }
): MockSpan {
  return createMockSpan(name);
}

/**
 * Execute a function within a traced span (pass-through)
 */
export async function withSpan<T>(
  name: string,
  fn: (span: MockSpan) => Promise<T>,
  _options?: {
    kind?: number;
    attributes?: Record<string, string | number | boolean>;
  }
): Promise<T> {
  const span = createMockSpan(name);
  const startTime = Date.now();
  const spanContext = span.spanContext();

  traceStore.addTrace({
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    name,
    startTime,
    status: 'pending',
    attributes: {},
  });

  try {
    const result = await fn(span);
    
    const endTime = Date.now();
    traceStore.updateTrace(spanContext.traceId, spanContext.spanId, {
      endTime,
      duration: endTime - startTime,
      status: 'success',
    });

    return result;
  } catch (error) {
    const endTime = Date.now();
    traceStore.updateTrace(spanContext.traceId, spanContext.spanId, {
      endTime,
      duration: endTime - startTime,
      status: 'error',
    });

    throw error;
  }
}

/**
 * Trace a React component render (no-op decorator)
 */
export function traceComponent(_componentName: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    return descriptor;
  };
}

/**
 * Create trace headers for propagation (returns empty object)
 */
export function getTraceHeaders(): Record<string, string> {
  return {};
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

// Export compatibility constants
export const SpanKind = {
  INTERNAL: 0,
  SERVER: 1,
  CLIENT: 2,
  PRODUCER: 3,
  CONSUMER: 4,
};

export const SpanStatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
};

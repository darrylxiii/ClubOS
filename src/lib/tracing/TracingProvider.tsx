/**
 * Tracing Provider Component
 * Initializes OpenTelemetry and provides tracing context
 */

import { createContext, useContext, useEffect, ReactNode, useCallback, useState } from 'react';
import { initializeTracing, traceStore, getTraceHeaders, withSpan } from './index';
import type { TraceEntry } from './index';
import type { Span } from '@opentelemetry/api';

interface TracingContextValue {
  isInitialized: boolean;
  getTraceHeaders: () => Record<string, string>;
  withSpan: <T>(name: string, fn: (span: Span) => Promise<T>, options?: {
    kind?: number;
    attributes?: Record<string, string | number | boolean>;
  }) => Promise<T>;
  getRecentTraces: (limit?: number) => TraceEntry[][];
  getAllTraces: () => Map<string, TraceEntry[]>;
}

const TracingContext = createContext<TracingContextValue | null>(null);

interface TracingProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function TracingProvider({ children, enabled = true }: TracingProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (enabled && !isInitialized) {
      initializeTracing();
      setIsInitialized(true);
    }
  }, [enabled, isInitialized]);

  const getRecentTraces = useCallback((limit = 20) => {
    return traceStore.getRecentTraces(limit);
  }, []);

  const getAllTraces = useCallback(() => {
    return traceStore.getAllTraces();
  }, []);

  const value: TracingContextValue = {
    isInitialized,
    getTraceHeaders,
    withSpan,
    getRecentTraces,
    getAllTraces,
  };

  return (
    <TracingContext.Provider value={value}>
      {children}
    </TracingContext.Provider>
  );
}

export function useTracing(): TracingContextValue {
  const context = useContext(TracingContext);
  if (!context) {
    throw new Error('useTracing must be used within a TracingProvider');
  }
  return context;
}

export function useOptionalTracing(): TracingContextValue | null {
  return useContext(TracingContext);
}

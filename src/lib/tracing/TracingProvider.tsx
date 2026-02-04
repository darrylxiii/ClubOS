/**
 * Tracing Provider Component - No-op Implementation
 * Simply renders children without tracing overhead.
 */

import { createContext, useContext, ReactNode, useCallback } from 'react';
import { traceStore, getTraceHeaders, withSpan } from './index';
import type { TraceEntry } from './index';

interface TracingContextValue {
  isInitialized: boolean;
  getTraceHeaders: () => Record<string, string>;
  withSpan: <T>(name: string, fn: (span: unknown) => Promise<T>, options?: {
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

export function TracingProvider({ children, enabled = false }: TracingProviderProps) {
  const getRecentTraces = useCallback((limit = 20) => {
    return traceStore.getRecentTraces(limit);
  }, []);

  const getAllTraces = useCallback(() => {
    return traceStore.getAllTraces();
  }, []);

  const value: TracingContextValue = {
    isInitialized: enabled,
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
    // Return default no-op implementation instead of throwing
    return {
      isInitialized: false,
      getTraceHeaders: () => ({}),
      withSpan: async <T,>(_name: string, fn: (span: unknown) => Promise<T>) => fn({}),
      getRecentTraces: () => [],
      getAllTraces: () => new Map(),
    };
  }
  return context;
}

export function useOptionalTracing(): TracingContextValue | null {
  return useContext(TracingContext);
}

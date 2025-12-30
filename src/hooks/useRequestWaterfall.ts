/**
 * Request Waterfall Hook
 * Collects and visualizes HTTP request timing data
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface RequestTiming {
  id: string;
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: number;
  statusText: string;
  size: number;
  type: 'fetch' | 'xhr' | 'resource';
  timing: {
    dns: number;
    tcp: number;
    tls: number;
    ttfb: number;
    download: number;
    total: number;
  };
  traceId?: string;
  error?: string;
}

interface RequestWaterfallState {
  requests: RequestTiming[];
  isRecording: boolean;
  startTime: number;
  totalDuration: number;
}

export function useRequestWaterfall(maxRequests = 100) {
  const [state, setState] = useState<RequestWaterfallState>({
    requests: [],
    isRecording: true,
    startTime: Date.now(),
    totalDuration: 0,
  });

  const requestsRef = useRef<Map<string, Partial<RequestTiming>>>(new Map());

  // Create unique request ID
  const createRequestId = useCallback(() => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Parse performance timing from Resource Timing API
  const parseResourceTiming = useCallback((entry: PerformanceResourceTiming) => {
    return {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      tls: entry.secureConnectionStart > 0 
        ? entry.connectEnd - entry.secureConnectionStart 
        : 0,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
      total: entry.responseEnd - entry.startTime,
    };
  }, []);

  // Add a request to the waterfall
  const addRequest = useCallback((request: RequestTiming) => {
    setState(prev => {
      const requests = [...prev.requests, request].slice(-maxRequests);
      const totalDuration = Math.max(
        ...requests.map(r => r.endTime - prev.startTime),
        0
      );
      return {
        ...prev,
        requests,
        totalDuration,
      };
    });
  }, [maxRequests]);

  // Start recording a request
  const startRequest = useCallback((
    url: string,
    method: string,
    traceId?: string
  ): string => {
    const id = createRequestId();
    requestsRef.current.set(id, {
      id,
      url,
      method,
      startTime: performance.now(),
      type: 'fetch',
      traceId,
    });
    return id;
  }, [createRequestId]);

  // End recording a request
  const endRequest = useCallback((
    id: string,
    status: number,
    statusText: string,
    size: number,
    error?: string
  ) => {
    const partialRequest = requestsRef.current.get(id);
    if (!partialRequest) return;

    const endTime = performance.now();
    const duration = endTime - (partialRequest.startTime || 0);

    // Try to get detailed timing from Resource Timing API
    let timing = {
      dns: 0,
      tcp: 0,
      tls: 0,
      ttfb: duration * 0.3,
      download: duration * 0.2,
      total: duration,
    };

    if ('performance' in window && partialRequest.url) {
      const entries = performance.getEntriesByName(partialRequest.url);
      const entry = entries[entries.length - 1] as PerformanceResourceTiming;
      if (entry && entry.entryType === 'resource') {
        timing = parseResourceTiming(entry);
      }
    }

    const request: RequestTiming = {
      id,
      url: partialRequest.url || '',
      method: partialRequest.method || 'GET',
      startTime: partialRequest.startTime || 0,
      endTime,
      duration,
      status,
      statusText,
      size,
      type: partialRequest.type || 'fetch',
      timing,
      traceId: partialRequest.traceId,
      error,
    };

    addRequest(request);
    requestsRef.current.delete(id);
  }, [addRequest, parseResourceTiming]);

  // Observe Resource Timing API entries
  useEffect(() => {
    if (!state.isRecording) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Skip if we already tracked this via fetch wrapper
          if (requestsRef.current.has(entry.name)) continue;

          const timing = parseResourceTiming(resourceEntry);
          
          const request: RequestTiming = {
            id: createRequestId(),
            url: entry.name,
            method: 'GET',
            startTime: entry.startTime,
            endTime: entry.startTime + resourceEntry.duration,
            duration: resourceEntry.duration,
            status: 200,
            statusText: 'OK',
            size: resourceEntry.transferSize || 0,
            type: 'resource',
            timing,
          };

          addRequest(request);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch {
      // Observer not supported
    }

    return () => {
      observer.disconnect();
    };
  }, [state.isRecording, addRequest, parseResourceTiming, createRequestId]);

  // Clear all requests
  const clearRequests = useCallback(() => {
    setState(prev => ({
      ...prev,
      requests: [],
      startTime: Date.now(),
      totalDuration: 0,
    }));
    requestsRef.current.clear();
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRecording: !prev.isRecording,
    }));
  }, []);

  // Get requests filtered by URL pattern
  const getFilteredRequests = useCallback((pattern?: string | RegExp) => {
    if (!pattern) return state.requests;
    
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    return state.requests.filter(r => regex.test(r.url));
  }, [state.requests]);

  // Get aggregate statistics
  const getStats = useCallback(() => {
    const { requests } = state;
    if (requests.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        totalSize: 0,
        errorRate: 0,
        avgTTFB: 0,
      };
    }

    const durations = requests.map(r => r.duration);
    const errors = requests.filter(r => r.status >= 400 || r.error);
    const ttfbs = requests.map(r => r.timing.ttfb);

    return {
      total: requests.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / requests.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      totalSize: requests.reduce((sum, r) => sum + r.size, 0),
      errorRate: (errors.length / requests.length) * 100,
      avgTTFB: ttfbs.reduce((a, b) => a + b, 0) / requests.length,
    };
  }, [state]);

  return {
    requests: state.requests,
    isRecording: state.isRecording,
    startTime: state.startTime,
    totalDuration: state.totalDuration,
    startRequest,
    endRequest,
    clearRequests,
    toggleRecording,
    getFilteredRequests,
    getStats,
  };
}

// Global singleton for request tracking
let globalRequestWaterfallInstance: ReturnType<typeof useRequestWaterfall> | null = null;

export function getGlobalRequestWaterfall() {
  return globalRequestWaterfallInstance;
}

export function setGlobalRequestWaterfall(instance: ReturnType<typeof useRequestWaterfall>) {
  globalRequestWaterfallInstance = instance;
}

/**
 * Navigation Tracing Hook
 * Wraps React Router navigation in OpenTelemetry spans
 */

import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { createSpan, traceStore, SpanKind, SpanStatusCode } from './index';
import type { Span } from '@opentelemetry/api';

interface NavigationSpanData {
  span: Span;
  startTime: number;
}

export function useNavigationTracing(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const activeSpanRef = useRef<NavigationSpanData | null>(null);

  useEffect(() => {
    // End previous navigation span
    if (activeSpanRef.current) {
      const { span, startTime } = activeSpanRef.current;
      const duration = Date.now() - startTime;
      
      span.setAttribute('navigation.duration_ms', duration);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      
      activeSpanRef.current = null;
    }

    // Create new navigation span
    const startTime = Date.now();
    const span = createSpan(`navigation:${location.pathname}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'navigation.pathname': location.pathname,
        'navigation.search': location.search,
        'navigation.hash': location.hash,
        'navigation.type': navigationType,
        'navigation.key': location.key,
      },
    });

    const spanContext = span.spanContext();

    // Add to trace store
    traceStore.addTrace({
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      name: `Navigation: ${location.pathname}`,
      startTime,
      status: 'pending',
      attributes: {
        pathname: location.pathname,
        type: navigationType,
      },
    });

    activeSpanRef.current = { span, startTime };

    // Track page load performance
    if ('performance' in window && 'getEntriesByType' in performance) {
      // Wait for page to be interactive
      requestAnimationFrame(() => {
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
        
        if (fcpEntry) {
          span.setAttribute('performance.fcp_ms', fcpEntry.startTime);
        }

        // Get navigation timing
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0) {
          const navTiming = navEntries[0] as PerformanceNavigationTiming;
          span.setAttribute('performance.dom_interactive_ms', navTiming.domInteractive);
          span.setAttribute('performance.dom_complete_ms', navTiming.domComplete);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (activeSpanRef.current) {
        const { span, startTime } = activeSpanRef.current;
        const duration = Date.now() - startTime;
        
        span.setAttribute('navigation.duration_ms', duration);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        
        const ctx = span.spanContext();
        traceStore.updateTrace(ctx.traceId, ctx.spanId, {
          endTime: Date.now(),
          duration,
          status: 'success',
        });
        
        activeSpanRef.current = null;
      }
    };
  }, [location.pathname, location.search, location.hash, navigationType, location.key]);
}

/**
 * Hook to trace user interactions
 */
export function useInteractionTracing(componentName: string) {
  const traceInteraction = (
    interactionType: string,
    details?: Record<string, unknown>
  ) => {
    const startTime = Date.now();
    const span = createSpan(`interaction:${componentName}:${interactionType}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'interaction.component': componentName,
        'interaction.type': interactionType,
        ...Object.fromEntries(
          Object.entries(details || {}).map(([k, v]) => [`interaction.${k}`, String(v)])
        ),
      },
    });

    const spanContext = span.spanContext();

    traceStore.addTrace({
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      name: `${componentName}: ${interactionType}`,
      startTime,
      status: 'pending',
      attributes: {
        component: componentName,
        type: interactionType,
        ...details,
      },
    });

    return {
      end: (status: 'success' | 'error' = 'success', error?: Error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (status === 'error' && error) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.recordException(error);
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }
        
        span.setAttribute('interaction.duration_ms', duration);
        span.end();

        traceStore.updateTrace(spanContext.traceId, spanContext.spanId, {
          endTime,
          duration,
          status,
        });
      },
    };
  };

  return { traceInteraction };
}

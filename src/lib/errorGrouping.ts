/**
 * AI-Powered Error Grouping Client
 * Integrates with Sentry and provides smart error deduplication
 */

import { supabase } from '@/integrations/supabase/client';
import * as Sentry from '@sentry/react';

interface ErrorReport {
  message: string;
  stack?: string;
  type?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorGroup {
  fingerprint: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedTitle: string;
  rootCause?: string;
  suggestedFix?: string;
  relatedErrors?: string[];
}

// Cache for fingerprints to reduce AI calls
const fingerprintCache = new Map<string, ErrorGroup>();
const MAX_CACHE_SIZE = 100;

/**
 * Generate a simple hash for cache key
 */
function hashError(error: ErrorReport): string {
  const str = `${error.type || ''}|${error.message?.slice(0, 100)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Get cached fingerprint or analyze error
 */
async function getOrAnalyzeError(error: ErrorReport): Promise<ErrorGroup> {
  const cacheKey = hashError(error);
  
  // Check cache first
  const cached = fingerprintCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Get existing groups for deduplication
    const existingGroups = Array.from(fingerprintCache.values())
      .map(g => g.fingerprint);

    const { data, error: fnError } = await supabase.functions.invoke(
      'ai-error-grouping',
      {
        body: { error, existingGroups },
      }
    );

    if (fnError) {
      console.error('[ErrorGrouping] Edge function error:', fnError);
      return generateLocalGrouping(error);
    }

    const grouping = data?.grouping as ErrorGroup;
    
    // Cache the result
    if (fingerprintCache.size >= MAX_CACHE_SIZE) {
      const firstKey = fingerprintCache.keys().next().value;
      if (firstKey) fingerprintCache.delete(firstKey);
    }
    fingerprintCache.set(cacheKey, grouping);

    return grouping;
  } catch (err) {
    console.error('[ErrorGrouping] Analysis failed:', err);
    return generateLocalGrouping(error);
  }
}

/**
 * Generate grouping locally (fallback)
 */
function generateLocalGrouping(error: ErrorReport): ErrorGroup {
  const message = error.message?.toLowerCase() || '';
  
  let category = 'unknown';
  let severity: ErrorGroup['severity'] = 'medium';
  
  if (message.includes('network') || message.includes('fetch')) {
    category = 'network';
    severity = 'medium';
  } else if (message.includes('type') || message.includes('undefined')) {
    category = 'type';
    severity = 'low';
  } else if (message.includes('auth') || message.includes('unauthorized')) {
    category = 'auth';
    severity = 'high';
  }

  const fingerprint = `local_${hashError(error)}`;
  
  return {
    fingerprint,
    category,
    severity,
    suggestedTitle: error.message?.slice(0, 100) || 'Unknown Error',
  };
}

/**
 * Enhanced Sentry error capture with AI grouping
 */
export async function captureErrorWithGrouping(
  error: Error,
  context?: Record<string, unknown>
): Promise<string> {
  const errorReport: ErrorReport = {
    message: error.message,
    stack: error.stack,
    type: error.name,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    timestamp: new Date().toISOString(),
    metadata: context,
  };

  // Analyze error in background
  const grouping = await getOrAnalyzeError(errorReport);

  // Configure Sentry with AI fingerprint
  const eventId = Sentry.captureException(error, {
    fingerprint: [grouping.fingerprint],
    tags: {
      errorCategory: grouping.category,
      errorSeverity: grouping.severity,
      aiGrouped: 'true',
    },
    contexts: {
      aiGrouping: {
        fingerprint: grouping.fingerprint,
        category: grouping.category,
        severity: grouping.severity,
        suggestedTitle: grouping.suggestedTitle,
        rootCause: grouping.rootCause,
        suggestedFix: grouping.suggestedFix,
      },
    },
    level: mapSeverityToLevel(grouping.severity),
  });

  // Log for debugging
  console.log('[ErrorGrouping] Captured error:', {
    eventId,
    fingerprint: grouping.fingerprint,
    category: grouping.category,
    severity: grouping.severity,
  });

  return eventId;
}

/**
 * Map severity to Sentry level
 */
function mapSeverityToLevel(severity: ErrorGroup['severity']): Sentry.SeverityLevel {
  switch (severity) {
    case 'critical':
      return 'fatal';
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'error';
  }
}

/**
 * Get grouping statistics
 */
export function getGroupingStats(): {
  cacheSize: number;
  categories: Record<string, number>;
  severities: Record<string, number>;
} {
  const categories: Record<string, number> = {};
  const severities: Record<string, number> = {};

  fingerprintCache.forEach((group) => {
    categories[group.category] = (categories[group.category] || 0) + 1;
    severities[group.severity] = (severities[group.severity] || 0) + 1;
  });

  return {
    cacheSize: fingerprintCache.size,
    categories,
    severities,
  };
}

/**
 * Clear grouping cache
 */
export function clearGroupingCache(): void {
  fingerprintCache.clear();
}

/**
 * Integration with global error handler
 */
export function setupGlobalErrorGrouping(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', async (event) => {
    if (event.error) {
      await captureErrorWithGrouping(event.error, {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    }
  });

  window.addEventListener('unhandledrejection', async (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    await captureErrorWithGrouping(error, {
      source: 'unhandledrejection',
    });
  });

  console.log('[ErrorGrouping] Global error grouping initialized');
}

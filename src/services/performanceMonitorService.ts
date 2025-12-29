import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { PERFORMANCE_THRESHOLDS, checkThreshold } from "@/utils/performanceBaselines";

export interface PerformanceMetric {
  metric_type: string;
  value: number;
  unit: string;
  page_path: string;
  user_agent?: string;
  connection_type?: string;
  metadata?: Record<string, unknown>;
}

export interface SLAViolation {
  metric_type: string;
  threshold_value: number;
  actual_value: number;
  severity: 'warning' | 'critical';
  page_path: string;
}

// Buffer to batch metrics before sending
let metricsBuffer: PerformanceMetric[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

/**
 * Queue a performance metric for batched upload
 */
export const queueMetric = (metric: PerformanceMetric): void => {
  metricsBuffer.push({
    ...metric,
    user_agent: navigator.userAgent,
    connection_type: (navigator as any).connection?.effectiveType || 'unknown',
  });

  // Check for SLA violations immediately
  const violation = checkForViolation(metric);
  if (violation) {
    reportViolation(violation);
  }

  // Flush if buffer is full
  if (metricsBuffer.length >= BUFFER_SIZE) {
    flushMetrics();
  } else if (!flushTimeout) {
    // Set up delayed flush
    flushTimeout = setTimeout(flushMetrics, FLUSH_INTERVAL);
  }
};

/**
 * Check if a metric violates SLA thresholds
 */
const checkForViolation = (metric: PerformanceMetric): SLAViolation | null => {
  const thresholdKey = metric.metric_type.toUpperCase().replace(/-/g, '_');
  const threshold = (PERFORMANCE_THRESHOLDS as any)[thresholdKey];
  
  if (!threshold) return null;

  const status = checkThreshold(thresholdKey, metric.value);
  
  if (status === 'critical') {
    return {
      metric_type: metric.metric_type,
      threshold_value: threshold.critical,
      actual_value: metric.value,
      severity: 'critical',
      page_path: metric.page_path,
    };
  } else if (status === 'warning') {
    return {
      metric_type: metric.metric_type,
      threshold_value: threshold.warning,
      actual_value: metric.value,
      severity: 'warning',
      page_path: metric.page_path,
    };
  }

  return null;
};

/**
 * Report an SLA violation
 */
const reportViolation = async (violation: SLAViolation): Promise<void> => {
  try {
    logger.warn('[Performance] SLA Violation detected', { ...violation });
    
    // Store violation in database for tracking
    const { error } = await supabase
      .from('sla_violations' as any)
      .insert({
        metric_type: violation.metric_type,
        threshold_value: violation.threshold_value,
        actual_value: violation.actual_value,
        severity: violation.severity,
        page_path: violation.page_path,
        user_agent: navigator.userAgent,
        detected_at: new Date().toISOString(),
      });

    if (error) {
      logger.error('[Performance] Failed to store SLA violation:', error);
    }
  } catch (err) {
    logger.error('[Performance] Error reporting violation:', err);
  }
};

/**
 * Flush metrics buffer to database
 */
export const flushMetrics = async (): Promise<void> => {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (metricsBuffer.length === 0) return;

  const metricsToSend = [...metricsBuffer];
  metricsBuffer = [];

  try {
    const { error } = await supabase
      .from('performance_metrics' as any)
      .insert(
        metricsToSend.map((m) => ({
          metric_type: m.metric_type,
          value: m.value,
          unit: m.unit,
          page_path: m.page_path,
          user_agent: m.user_agent,
          connection_type: m.connection_type,
          metadata: m.metadata || {},
          recorded_at: new Date().toISOString(),
        }))
      );

    if (error) {
      logger.error('[Performance] Failed to store metrics:', error);
      // Re-queue failed metrics
      metricsBuffer = [...metricsToSend, ...metricsBuffer];
    } else {
      logger.debug(`[Performance] Flushed ${metricsToSend.length} metrics`);
    }
  } catch (err) {
    logger.error('[Performance] Error flushing metrics:', err);
    metricsBuffer = [...metricsToSend, ...metricsBuffer];
  }
};

/**
 * Track Core Web Vitals
 */
export const trackCoreWebVital = (
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP',
  value: number
): void => {
  const unitMap: Record<string, string> = {
    LCP: 'ms',
    FID: 'ms',
    CLS: 'score',
    TTFB: 'ms',
    INP: 'ms',
  };

  queueMetric({
    metric_type: name.toLowerCase(),
    value,
    unit: unitMap[name] || 'ms',
    page_path: window.location.pathname,
  });
};

/**
 * Track custom timing metric
 */
export const trackTiming = (
  name: string,
  duration: number,
  metadata?: Record<string, unknown>
): void => {
  queueMetric({
    metric_type: name,
    value: duration,
    unit: 'ms',
    page_path: window.location.pathname,
    metadata,
  });
};

/**
 * Measure async operation
 */
export const measureAsync = async <T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await operation();
    const duration = performance.now() - start;
    trackTiming(name, duration, { ...metadata, success: true });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    trackTiming(name, duration, { ...metadata, success: false, error: String(error) });
    throw error;
  }
};

// Flush metrics before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushMetrics();
  });
  
  // Also flush on visibility change (mobile background)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushMetrics();
    }
  });
}

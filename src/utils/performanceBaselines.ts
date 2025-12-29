/**
 * Performance Baseline SLAs
 * Defines target thresholds for application performance metrics
 */

export interface PerformanceSLA {
  name: string;
  metric: string;
  threshold: number;
  unit: 'ms' | 's' | 'score';
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

/**
 * Core Web Vitals SLAs (Google standards)
 */
export const WEB_VITALS_SLAS: PerformanceSLA[] = [
  {
    name: 'Largest Contentful Paint',
    metric: 'LCP',
    threshold: 2500,
    unit: 'ms',
    severity: 'critical',
    description: 'Main content should load within 2.5 seconds',
  },
  {
    name: 'First Input Delay',
    metric: 'FID',
    threshold: 100,
    unit: 'ms',
    severity: 'critical',
    description: 'First interaction should respond within 100ms',
  },
  {
    name: 'Cumulative Layout Shift',
    metric: 'CLS',
    threshold: 0.1,
    unit: 'score',
    severity: 'warning',
    description: 'Visual stability score should be under 0.1',
  },
  {
    name: 'First Contentful Paint',
    metric: 'FCP',
    threshold: 1800,
    unit: 'ms',
    severity: 'warning',
    description: 'First content should paint within 1.8 seconds',
  },
  {
    name: 'Time to First Byte',
    metric: 'TTFB',
    threshold: 600,
    unit: 'ms',
    severity: 'warning',
    description: 'Server response should start within 600ms',
  },
  {
    name: 'Interaction to Next Paint',
    metric: 'INP',
    threshold: 200,
    unit: 'ms',
    severity: 'critical',
    description: 'Interactions should complete within 200ms',
  },
];

/**
 * Application Performance SLAs
 */
export const APP_PERFORMANCE_SLAS: PerformanceSLA[] = [
  {
    name: 'Page Load Time',
    metric: 'pageLoad',
    threshold: 3000,
    unit: 'ms',
    severity: 'critical',
    description: 'Full page load should complete within 3 seconds',
  },
  {
    name: 'API Response Time',
    metric: 'apiResponse',
    threshold: 500,
    unit: 'ms',
    severity: 'critical',
    description: 'API calls should respond within 500ms',
  },
  {
    name: 'Route Transition',
    metric: 'routeTransition',
    threshold: 300,
    unit: 'ms',
    severity: 'warning',
    description: 'Route changes should complete within 300ms',
  },
  {
    name: 'Component Render',
    metric: 'componentRender',
    threshold: 16,
    unit: 'ms',
    severity: 'info',
    description: 'Components should render within 16ms (60fps)',
  },
  {
    name: 'Database Query',
    metric: 'dbQuery',
    threshold: 200,
    unit: 'ms',
    severity: 'warning',
    description: 'Database queries should complete within 200ms',
  },
];

/**
 * Real-time Feature SLAs (WebRTC, Meetings)
 */
export const REALTIME_SLAS: PerformanceSLA[] = [
  {
    name: 'WebRTC Connection',
    metric: 'webrtcConnection',
    threshold: 3000,
    unit: 'ms',
    severity: 'critical',
    description: 'WebRTC connection should establish within 3 seconds',
  },
  {
    name: 'Audio Latency',
    metric: 'audioLatency',
    threshold: 150,
    unit: 'ms',
    severity: 'critical',
    description: 'Audio latency should stay under 150ms',
  },
  {
    name: 'Video Frame Rate',
    metric: 'videoFps',
    threshold: 24,
    unit: 'score',
    severity: 'warning',
    description: 'Video should maintain at least 24 FPS',
  },
  {
    name: 'Message Delivery',
    metric: 'messageDelivery',
    threshold: 1000,
    unit: 'ms',
    severity: 'warning',
    description: 'Real-time messages should deliver within 1 second',
  },
];

/**
 * All SLAs combined
 */
export const ALL_PERFORMANCE_SLAS: PerformanceSLA[] = [
  ...WEB_VITALS_SLAS,
  ...APP_PERFORMANCE_SLAS,
  ...REALTIME_SLAS,
];

/**
 * Check if a metric value meets its SLA
 */
export function checkSLA(
  metric: string,
  value: number
): { passed: boolean; sla: PerformanceSLA | undefined; delta: number } {
  const sla = ALL_PERFORMANCE_SLAS.find((s) => s.metric === metric);
  
  if (!sla) {
    return { passed: true, sla: undefined, delta: 0 };
  }

  const passed = value <= sla.threshold;
  const delta = value - sla.threshold;

  return { passed, sla, delta };
}

/**
 * Get SLA status color based on value
 */
export function getSLAStatus(
  metric: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const sla = ALL_PERFORMANCE_SLAS.find((s) => s.metric === metric);
  
  if (!sla) return 'good';

  if (value <= sla.threshold) {
    return 'good';
  } else if (value <= sla.threshold * 1.5) {
    return 'needs-improvement';
  } else {
    return 'poor';
  }
}

/**
 * Format metric value with unit
 */
export function formatMetricValue(metricOrValue: string | number, valueOrUnit?: number | PerformanceSLA['unit']): string {
  // Handle overloaded signature
  let value: number;
  let unit: PerformanceSLA['unit'] = 'ms';
  
  if (typeof metricOrValue === 'string' && typeof valueOrUnit === 'number') {
    // Called as formatMetricValue(metricType, value)
    value = valueOrUnit;
    const sla = ALL_PERFORMANCE_SLAS.find(s => s.metric.toLowerCase() === metricOrValue.toLowerCase());
    unit = sla?.unit || 'ms';
  } else if (typeof metricOrValue === 'number') {
    // Called as formatMetricValue(value, unit)
    value = metricOrValue;
    unit = (valueOrUnit as PerformanceSLA['unit']) || 'ms';
  } else {
    return String(metricOrValue);
  }

  switch (unit) {
    case 'ms':
      return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`;
    case 's':
      return `${value.toFixed(2)}s`;
    case 'score':
      return value.toFixed(3);
    default:
      return String(value);
  }
}

/**
 * Threshold configuration for performance monitoring
 */
export const PERFORMANCE_THRESHOLDS: Record<string, { warning: number; critical: number }> = {
  LCP: { warning: 2500, critical: 4000 },
  FID: { warning: 100, critical: 300 },
  CLS: { warning: 0.1, critical: 0.25 },
  TTFB: { warning: 600, critical: 1200 },
  INP: { warning: 200, critical: 500 },
  FCP: { warning: 1800, critical: 3000 },
};

/**
 * Check threshold status
 */
export function checkThreshold(metric: string, value: number): 'good' | 'warning' | 'critical' {
  const threshold = PERFORMANCE_THRESHOLDS[metric.toUpperCase()];
  if (!threshold) return 'good';
  
  if (value >= threshold.critical) return 'critical';
  if (value >= threshold.warning) return 'warning';
  return 'good';
}

/**
 * Performance budget configuration
 */
export const PERFORMANCE_BUDGET = {
  // Bundle size limits (in KB)
  bundleSize: {
    total: 500,
    vendor: 300,
    main: 150,
    styles: 50,
  },
  // Image size limits (in KB)
  imageSize: {
    hero: 200,
    thumbnail: 50,
    avatar: 20,
  },
  // Request count limits
  requestCount: {
    initial: 10,
    total: 50,
  },
} as const;

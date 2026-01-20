import { logger } from '@/lib/logger';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: Date;
}

interface LongTask {
  duration: number;
  startTime: number;
  attributionName?: string;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
}

/**
 * Performance Monitoring Service
 * Tracks Web Vitals, long tasks, and memory pressure
 */
class PerformanceMonitorService {
  private metrics: PerformanceMetric[] = [];
  private longTasks: LongTask[] = [];
  private isMonitoring = false;
  private longTaskObserver: PerformanceObserver | null = null;

  // Web Vitals thresholds
  private readonly THRESHOLDS = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
    INP: { good: 200, poor: 500 },
  };

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isMonitoring || typeof window === 'undefined') return;
    this.isMonitoring = true;

    // Monitor Web Vitals
    this.observeWebVitals();

    // Monitor Long Tasks
    this.observeLongTasks();

    // Monitor Memory periodically
    this.startMemoryMonitoring();

    // Log initial paint metrics
    this.logPaintMetrics();
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    this.isMonitoring = false;
    this.longTaskObserver?.disconnect();
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get long tasks
   */
  getLongTasks(): LongTask[] {
    return [...this.longTasks];
  }

  /**
   * Get current memory info
   */
  getMemoryInfo(): MemoryInfo | null {
    if (!('memory' in performance)) return null;

    const memory = (performance as unknown as { memory: MemoryInfo }).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }

  /**
   * Observe Web Vitals using PerformanceObserver
   */
  private observeWebVitals(): void {
    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformancePaintTiming;
        if (lastEntry) {
          this.recordMetric('LCP', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Not supported
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fidEntry = entry as PerformanceEventTiming;
          if (fidEntry.processingStart) {
            this.recordMetric('FID', fidEntry.processingStart - fidEntry.startTime);
          }
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {
      // Not supported
    }

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[];
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric('CLS', clsValue);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // Not supported
    }

    // Interaction to Next Paint
    try {
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEventTiming[];
        entries.forEach((entry) => {
          if (entry.duration) {
            this.recordMetric('INP', entry.duration);
          }
        });
      });
      inpObserver.observe({ type: 'event', buffered: true });
    } catch {
      // Not supported
    }
  }

  /**
   * Observe long tasks (>50ms)
   */
  private observeLongTasks(): void {
    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const longTask: LongTask = {
            duration: entry.duration,
            startTime: entry.startTime,
            attributionName: entry.name,
          };
          
          this.longTasks.push(longTask);

          // Log if task is very long (>100ms)
          if (entry.duration > 100) {
            logger.warn('Long task detected', {
              duration: `${entry.duration.toFixed(0)}ms`,
              componentName: 'PerformanceMonitor',
            });
          }
        });
      });
      this.longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      // Not supported
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    // Check memory every 30 seconds
    const checkMemory = () => {
      if (!this.isMonitoring) return;

      const memoryInfo = this.getMemoryInfo();
      if (memoryInfo && memoryInfo.usagePercent > 80) {
        logger.warn('High memory usage detected', {
          usagePercent: `${memoryInfo.usagePercent.toFixed(1)}%`,
          usedMB: `${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
          componentName: 'PerformanceMonitor',
        });
      }

      setTimeout(checkMemory, 30000);
    };

    checkMemory();
  }

  /**
   * Log initial paint metrics
   */
  private logPaintMetrics(): void {
    // Wait for metrics to be available
    setTimeout(() => {
      const paintEntries = performance.getEntriesByType('paint');
      
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime);
        }
      });

      // Time to First Byte
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        this.recordMetric('TTFB', nav.responseStart - nav.requestStart);
      }
    }, 3000);
  }

  /**
   * Record a performance metric
   */
  private recordMetric(name: keyof typeof this.THRESHOLDS, value: number): void {
    const thresholds = this.THRESHOLDS[name];
    let rating: 'good' | 'needs-improvement' | 'poor';

    if (value <= thresholds.good) {
      rating = 'good';
    } else if (value <= thresholds.poor) {
      rating = 'needs-improvement';
    } else {
      rating = 'poor';
    }

    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: new Date(),
    };

    this.metrics.push(metric);

    // Log poor performance
    if (rating === 'poor') {
      logger.warn(`Poor ${name} performance`, {
        value: `${value.toFixed(2)}${name === 'CLS' ? '' : 'ms'}`,
        threshold: `${thresholds.poor}${name === 'CLS' ? '' : 'ms'}`,
        componentName: 'PerformanceMonitor',
      });
    }
  }

  /**
   * Get a performance summary
   */
  getSummary(): {
    overallRating: 'good' | 'needs-improvement' | 'poor';
    metrics: Record<string, PerformanceMetric | undefined>;
    longTaskCount: number;
    avgLongTaskDuration: number;
    memoryPressure: boolean;
  } {
    // Get latest metric of each type
    const latestMetrics: Record<string, PerformanceMetric | undefined> = {};
    this.metrics.forEach((m) => {
      latestMetrics[m.name] = m;
    });

    // Calculate overall rating
    const ratings = Object.values(latestMetrics)
      .filter((m): m is PerformanceMetric => m !== undefined)
      .map((m) => m.rating);

    let overallRating: 'good' | 'needs-improvement' | 'poor' = 'good';
    if (ratings.includes('poor')) {
      overallRating = 'poor';
    } else if (ratings.includes('needs-improvement')) {
      overallRating = 'needs-improvement';
    }

    // Calculate long task stats
    const avgLongTaskDuration =
      this.longTasks.length > 0
        ? this.longTasks.reduce((sum, t) => sum + t.duration, 0) / this.longTasks.length
        : 0;

    // Check memory pressure
    const memoryInfo = this.getMemoryInfo();
    const memoryPressure = memoryInfo ? memoryInfo.usagePercent > 70 : false;

    return {
      overallRating,
      metrics: latestMetrics,
      longTaskCount: this.longTasks.length,
      avgLongTaskDuration,
      memoryPressure,
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitorService();

// Auto-start in browser
if (typeof window !== 'undefined') {
  // Start after page load
  if (document.readyState === 'complete') {
    performanceMonitor.start();
  } else {
    window.addEventListener('load', () => {
      performanceMonitor.start();
    });
  }
}

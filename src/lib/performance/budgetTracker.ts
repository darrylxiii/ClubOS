/**
 * Performance Budget System
 * Tracks and alerts on performance budget violations
 */

export interface PerformanceBudget {
  name: string;
  metric: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP' | 'custom';
  threshold: number;
  unit: 'ms' | 's' | 'score';
  severity: 'warning' | 'error';
}

export interface BudgetViolation {
  budget: PerformanceBudget;
  actualValue: number;
  timestamp: number;
  url: string;
  overage: number;
  overagePercent: number;
}

// Default performance budgets based on Web Vitals
export const DEFAULT_BUDGETS: PerformanceBudget[] = [
  { name: 'LCP', metric: 'LCP', threshold: 2500, unit: 'ms', severity: 'error' },
  { name: 'FID', metric: 'FID', threshold: 100, unit: 'ms', severity: 'error' },
  { name: 'CLS', metric: 'CLS', threshold: 0.1, unit: 'score', severity: 'error' },
  { name: 'TTFB', metric: 'TTFB', threshold: 800, unit: 'ms', severity: 'warning' },
  { name: 'FCP', metric: 'FCP', threshold: 1800, unit: 'ms', severity: 'warning' },
  { name: 'INP', metric: 'INP', threshold: 200, unit: 'ms', severity: 'error' },
];

class PerformanceBudgetTracker {
  private budgets: PerformanceBudget[] = [...DEFAULT_BUDGETS];
  private violations: BudgetViolation[] = [];
  private listeners: ((violation: BudgetViolation) => void)[] = [];
  private maxViolationsStored = 100;

  setBudgets(budgets: PerformanceBudget[]): void {
    this.budgets = budgets;
  }

  addBudget(budget: PerformanceBudget): void {
    this.budgets.push(budget);
  }

  checkMetric(
    metric: PerformanceBudget['metric'],
    value: number,
    url = window.location.pathname
  ): BudgetViolation | null {
    const budget = this.budgets.find((b) => b.metric === metric);
    if (!budget) return null;

    if (value > budget.threshold) {
      const violation: BudgetViolation = {
        budget,
        actualValue: value,
        timestamp: Date.now(),
        url,
        overage: value - budget.threshold,
        overagePercent: ((value - budget.threshold) / budget.threshold) * 100,
      };

      this.recordViolation(violation);
      return violation;
    }

    return null;
  }

  private recordViolation(violation: BudgetViolation): void {
    this.violations.push(violation);

    // Trim old violations
    if (this.violations.length > this.maxViolationsStored) {
      this.violations = this.violations.slice(-this.maxViolationsStored);
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(violation));

    // Log to console
    const logLevel = violation.budget.severity === 'error' ? 'error' : 'warn';
    console[logLevel](
      `[PerformanceBudget] ${violation.budget.name} exceeded: ` +
        `${violation.actualValue}${violation.budget.unit} > ${violation.budget.threshold}${violation.budget.unit} ` +
        `(+${violation.overagePercent.toFixed(1)}%) on ${violation.url}`
    );
  }

  onViolation(listener: (violation: BudgetViolation) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getViolations(since?: number): BudgetViolation[] {
    if (!since) return [...this.violations];
    return this.violations.filter((v) => v.timestamp >= since);
  }

  getViolationSummary(): Record<string, { count: number; avgOverage: number }> {
    const summary: Record<string, { count: number; totalOverage: number }> = {};

    this.violations.forEach((v) => {
      if (!summary[v.budget.name]) {
        summary[v.budget.name] = { count: 0, totalOverage: 0 };
      }
      summary[v.budget.name].count++;
      summary[v.budget.name].totalOverage += v.overagePercent;
    });

    return Object.fromEntries(
      Object.entries(summary).map(([name, data]) => [
        name,
        { count: data.count, avgOverage: data.totalOverage / data.count },
      ])
    );
  }

  clearViolations(): void {
    this.violations = [];
  }
}

export const performanceBudgetTracker = new PerformanceBudgetTracker();

// Web Vitals integration
export function setupWebVitalsTracking(): void {
  if (typeof window === 'undefined') return;

  // Use Performance Observer for Core Web Vitals
  try {
    // LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      performanceBudgetTracker.checkMetric('LCP', lastEntry.startTime);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // FID
    const fidObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        performanceBudgetTracker.checkMetric('FID', fidEntry.processingStart - fidEntry.startTime);
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!(entry as LayoutShift).hadRecentInput) {
          clsValue += (entry as LayoutShift).value;
        }
      });
      performanceBudgetTracker.checkMetric('CLS', clsValue);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

  } catch (_e) {
    console.warn('[PerformanceBudget] Failed to setup Web Vitals tracking:', e);
  }
}

// Type definitions for Web Vitals
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}

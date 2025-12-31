/**
 * Memory Leak Detection
 * Monitors memory usage and detects potential leaks
 */

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  detachedNodes?: number;
  eventListenerCount?: number;
}

export interface LeakSuspect {
  type: 'heap_growth' | 'detached_nodes' | 'listener_accumulation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  data: Record<string, unknown>;
}

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 60; // Keep last hour at 1min intervals
  private intervalId: number | null = null;
  private leakListeners: ((suspect: LeakSuspect) => void)[] = [];

  start(intervalMs = 60000): void {
    if (this.intervalId) return;
    if (!this.isSupported()) {
      console.warn('[MemoryMonitor] Performance.memory API not supported');
      return;
    }

    this.takeSnapshot();
    this.intervalId = window.setInterval(() => {
      this.takeSnapshot();
      this.analyzeForLeaks();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'performance' in window && 
           'memory' in (performance as Performance & { memory?: MemoryInfo });
  }

  takeSnapshot(): MemorySnapshot | null {
    if (!this.isSupported()) return null;

    const memory = (performance as Performance & { memory: MemoryInfo }).memory;
    
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };

    this.snapshots.push(snapshot);

    // Trim old snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    return snapshot;
  }

  private analyzeForLeaks(): void {
    if (this.snapshots.length < 5) return;

    const recentSnapshots = this.snapshots.slice(-10);
    const suspects: LeakSuspect[] = [];

    // Check for continuous heap growth
    const heapGrowthRate = this.calculateGrowthRate(
      recentSnapshots.map((s) => s.usedJSHeapSize)
    );

    if (heapGrowthRate > 0.05) { // 5% growth per interval
      suspects.push({
        type: 'heap_growth',
        severity: heapGrowthRate > 0.1 ? 'high' : heapGrowthRate > 0.07 ? 'medium' : 'low',
        description: `Memory heap growing at ${(heapGrowthRate * 100).toFixed(1)}% per interval`,
        recommendation: 'Check for uncleared intervals, growing arrays, or component cleanup issues',
        data: {
          growthRate: heapGrowthRate,
          currentHeap: recentSnapshots[recentSnapshots.length - 1].usedJSHeapSize,
          trend: recentSnapshots.map((s) => s.usedJSHeapSize),
        },
      });
    }

    // Check heap utilization
    const latestSnapshot = recentSnapshots[recentSnapshots.length - 1];
    const heapUtilization = latestSnapshot.usedJSHeapSize / latestSnapshot.jsHeapSizeLimit;

    if (heapUtilization > 0.8) {
      suspects.push({
        type: 'heap_growth',
        severity: heapUtilization > 0.9 ? 'high' : 'medium',
        description: `Heap utilization at ${(heapUtilization * 100).toFixed(1)}%`,
        recommendation: 'Consider optimizing memory usage or increasing available memory',
        data: {
          utilization: heapUtilization,
          used: latestSnapshot.usedJSHeapSize,
          limit: latestSnapshot.jsHeapSizeLimit,
        },
      });
    }

    // Notify listeners
    suspects.forEach((suspect) => {
      this.leakListeners.forEach((listener) => listener(suspect));
    });
  }

  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;

    let growthSum = 0;
    for (let i = 1; i < values.length; i++) {
      growthSum += (values[i] - values[i - 1]) / values[i - 1];
    }

    return growthSum / (values.length - 1);
  }

  onLeakSuspected(listener: (suspect: LeakSuspect) => void): () => void {
    this.leakListeners.push(listener);
    return () => {
      this.leakListeners = this.leakListeners.filter((l) => l !== listener);
    };
  }

  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  getCurrentMemory(): MemorySnapshot | null {
    return this.takeSnapshot();
  }

  getMemoryTrend(): { 
    trend: 'stable' | 'growing' | 'shrinking'; 
    rate: number;
    current: number;
    peak: number;
  } {
    if (this.snapshots.length < 2) {
      return { trend: 'stable', rate: 0, current: 0, peak: 0 };
    }

    const recentSnapshots = this.snapshots.slice(-10);
    const rate = this.calculateGrowthRate(recentSnapshots.map((s) => s.usedJSHeapSize));
    const current = recentSnapshots[recentSnapshots.length - 1].usedJSHeapSize;
    const peak = Math.max(...this.snapshots.map((s) => s.usedJSHeapSize));

    let trend: 'stable' | 'growing' | 'shrinking' = 'stable';
    if (rate > 0.02) trend = 'growing';
    else if (rate < -0.02) trend = 'shrinking';

    return { trend, rate, current, peak };
  }

  clear(): void {
    this.snapshots = [];
  }
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export const memoryMonitor = new MemoryMonitor();

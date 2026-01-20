/**
 * Debug Mode System
 * Development tools and debugging utilities
 */

export interface DebugConfig {
  enabled: boolean;
  showTraces: boolean;
  showNetworkLogs: boolean;
  showStateChanges: boolean;
  showPerformanceMetrics: boolean;
  showMemoryStats: boolean;
  verboseLogging: boolean;
  breakOnError: boolean;
}

const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  enabled: false,
  showTraces: false,
  showNetworkLogs: false,
  showStateChanges: false,
  showPerformanceMetrics: false,
  showMemoryStats: false,
  verboseLogging: false,
  breakOnError: false,
};

class DebugMode {
  private config: DebugConfig = { ...DEFAULT_DEBUG_CONFIG };
  private listeners: ((config: DebugConfig) => void)[] = [];
  private logs: DebugLogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    this.loadConfig();
    this.setupGlobalAccess();
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('debug_mode_config');
      if (stored) {
        this.config = { ...DEFAULT_DEBUG_CONFIG, ...JSON.parse(stored) };
      }

      // Auto-enable in development
      if (import.meta.env.DEV) {
        this.config.enabled = true;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('debug_mode_config', JSON.stringify(this.config));
    } catch {
      // Ignore localStorage errors
    }
  }

  private setupGlobalAccess(): void {
    if (typeof window === 'undefined') return;

    // Expose debug tools to console
    (window as unknown as { __DEBUG__: DebugMode }).__DEBUG__ = this;
    
    console.log(
      '%c[Debug Mode] Available via window.__DEBUG__',
      'color: #C9A24E; font-weight: bold;'
    );
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): DebugConfig {
    return { ...this.config };
  }

  setConfig(updates: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.notifyListeners();
  }

  enable(): void {
    this.setConfig({ enabled: true });
  }

  disable(): void {
    this.setConfig({ enabled: false });
  }

  toggle(): boolean {
    const newState = !this.config.enabled;
    this.setConfig({ enabled: newState });
    return newState;
  }

  // Logging utilities
  log(category: string, message: string, data?: unknown): void {
    if (!this.config.enabled) return;

    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      category,
      message,
      data,
      level: 'info',
    };

    this.addLogEntry(entry);

    if (this.config.verboseLogging) {
      console.log(`[${category}]`, message, data);
    }
  }

  warn(category: string, message: string, data?: unknown): void {
    if (!this.config.enabled) return;

    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      category,
      message,
      data,
      level: 'warn',
    };

    this.addLogEntry(entry);
    console.warn(`[${category}]`, message, data);
  }

  error(category: string, message: string, data?: unknown): void {
    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      category,
      message,
      data,
      level: 'error',
    };

    this.addLogEntry(entry);
    console.error(`[${category}]`, message, data);

    if (this.config.enabled && this.config.breakOnError) {
      debugger;
    }
  }

  trace(name: string, duration: number, metadata?: Record<string, unknown>): void {
    if (!this.config.enabled || !this.config.showTraces) return;

    console.log(
      `%c[Trace] ${name}: ${duration.toFixed(2)}ms`,
      'color: #4CAF50;',
      metadata
    );
  }

  network(method: string, url: string, status: number, duration: number): void {
    if (!this.config.enabled || !this.config.showNetworkLogs) return;

    const color = status >= 400 ? '#f44336' : status >= 300 ? '#ff9800' : '#4CAF50';
    console.log(
      `%c[Network] ${method} ${url} - ${status} (${duration.toFixed(0)}ms)`,
      `color: ${color};`
    );
  }

  stateChange(component: string, prevState: unknown, nextState: unknown): void {
    if (!this.config.enabled || !this.config.showStateChanges) return;

    console.groupCollapsed(`[State] ${component}`);
    console.log('Previous:', prevState);
    console.log('Next:', nextState);
    console.groupEnd();
  }

  private addLogEntry(entry: DebugLogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getLogs(filter?: { category?: string; level?: string; since?: number }): DebugLogEntry[] {
    let result = [...this.logs];

    if (filter?.category) {
      result = result.filter((l) => l.category === filter.category);
    }
    if (filter?.level) {
      result = result.filter((l) => l.level === filter.level);
    }
    if (filter?.since) {
      result = result.filter((l) => l.timestamp >= filter.since);
    }

    return result;
  }

  clearLogs(): void {
    this.logs = [];
  }

  onChange(listener: (config: DebugConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.config));
  }

  // Quick access methods for common debug patterns
  time(label: string): () => void {
    if (!this.config.enabled) return () => {};
    
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.trace(label, duration);
    };
  }

  group(label: string): void {
    if (!this.config.enabled) return;
    console.group(label);
  }

  groupEnd(): void {
    if (!this.config.enabled) return;
    console.groupEnd();
  }

  table(data: unknown): void {
    if (!this.config.enabled) return;
    console.table(data);
  }
}

interface DebugLogEntry {
  timestamp: number;
  category: string;
  message: string;
  data?: unknown;
  level: 'info' | 'warn' | 'error';
}

export const debugMode = new DebugMode();

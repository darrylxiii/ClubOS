/**
 * Feature Flag System
 * Safe feature rollout with A/B testing support
 */

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;  // 0-100
  targetUsers?: string[];      // Specific user IDs
  targetRoles?: string[];      // Specific roles
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeatureFlagContext {
  userId?: string;
  role?: string;
  email?: string;
  sessionId?: string;
  customAttributes?: Record<string, unknown>;
}

// Default feature flags for the application
const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: 'pilot_enabled', enabled: false, description: 'Club Pilot task automation' },
  { key: 'dossier_sharing_v2', enabled: false, description: 'Enhanced dossier sharing' },
  { key: 'ghost_mode', enabled: false, description: 'Anonymous candidate browsing' },
  { key: 'drops_engine', enabled: false, description: 'Opportunity drops system' },
  { key: 'ai_matching_v2', enabled: true, description: 'Enhanced AI matching algorithm' },
  { key: 'performance_dashboard', enabled: true, description: 'Performance monitoring dashboard' },
  { key: 'memory_monitoring', enabled: false, description: 'Memory leak detection' },
];

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private context: FeatureFlagContext = {};
  private overrides: Map<string, boolean> = new Map();
  private listeners: ((key: string, enabled: boolean) => void)[] = [];

  constructor() {
    // Initialize with defaults
    DEFAULT_FLAGS.forEach((flag) => this.flags.set(flag.key, flag));
    
    // Load overrides from localStorage in dev
    this.loadLocalOverrides();
  }

  private loadLocalOverrides(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('feature_flag_overrides');
      if (stored) {
        const overrides = JSON.parse(stored);
        Object.entries(overrides).forEach(([key, value]) => {
          this.overrides.set(key, value as boolean);
        });
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private saveLocalOverrides(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const overrides = Object.fromEntries(this.overrides);
      localStorage.setItem('feature_flag_overrides', JSON.stringify(overrides));
    } catch {
      // Ignore localStorage errors
    }
  }

  setContext(context: FeatureFlagContext): void {
    this.context = context;
  }

  updateContext(updates: Partial<FeatureFlagContext>): void {
    this.context = { ...this.context, ...updates };
  }

  setFlags(flags: FeatureFlag[]): void {
    flags.forEach((flag) => this.flags.set(flag.key, flag));
  }

  isEnabled(key: string): boolean {
    // Check local overrides first (for development)
    if (this.overrides.has(key)) {
      return this.overrides.get(key)!;
    }

    const flag = this.flags.get(key);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check user targeting
    if (flag.targetUsers?.length && this.context.userId) {
      if (flag.targetUsers.includes(this.context.userId)) {
        return true;
      }
    }

    // Check role targeting
    if (flag.targetRoles?.length && this.context.role) {
      if (flag.targetRoles.includes(this.context.role)) {
        return true;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const hash = this.hashString(`${key}:${this.context.userId || this.context.sessionId || 'anonymous'}`);
      const bucket = hash % 100;
      return bucket < flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  // Development helpers
  setOverride(key: string, enabled: boolean): void {
    this.overrides.set(key, enabled);
    this.saveLocalOverrides();
    this.notifyListeners(key, enabled);
  }

  clearOverride(key: string): void {
    this.overrides.delete(key);
    this.saveLocalOverrides();
    const flag = this.flags.get(key);
    this.notifyListeners(key, flag?.enabled ?? false);
  }

  clearAllOverrides(): void {
    this.overrides.clear();
    this.saveLocalOverrides();
  }

  getOverrides(): Record<string, boolean> {
    return Object.fromEntries(this.overrides);
  }

  onChange(listener: (key: string, enabled: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(key: string, enabled: boolean): void {
    this.listeners.forEach((listener) => listener(key, enabled));
  }
}

export const featureFlags = new FeatureFlagService();

// React hook helper
export function useFeatureFlag(key: string): boolean {
  return featureFlags.isEnabled(key);
}

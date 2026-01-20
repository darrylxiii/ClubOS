import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface ErrorRateData {
  timestamp: Date;
  count: number;
  severity: string;
}

interface ErrorSpike {
  detected: boolean;
  currentRate: number;
  baselineRate: number;
  multiplier: number;
}

interface ErrorTrend {
  period: string;
  total: number;
  critical: number;
  error: number;
  warning: number;
  info: number;
}

/**
 * Error Rate Monitoring Service
 * Tracks error rates, detects spikes, and provides analytics
 */
class ErrorMonitoringService {
  private errorBuffer: ErrorRateData[] = [];
  private baselineRate: number = 0;
  private readonly SPIKE_THRESHOLD = 3; // 3x baseline triggers spike
  private readonly BUFFER_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
  private readonly BASELINE_SAMPLE_SIZE = 100;

  /**
   * Record an error occurrence for rate tracking
   */
  recordError(severity: string = 'error'): void {
    this.errorBuffer.push({
      timestamp: new Date(),
      count: 1,
      severity,
    });

    // Clean old entries
    this.cleanBuffer();

    // Check for spike
    this.checkForSpike();
  }

  /**
   * Get current error rate (errors per minute)
   */
  getCurrentRate(): number {
    this.cleanBuffer();
    const oneMinuteAgo = Date.now() - 60 * 1000;
    const recentErrors = this.errorBuffer.filter(
      (e) => e.timestamp.getTime() > oneMinuteAgo
    );
    return recentErrors.length;
  }

  /**
   * Get error rate for last N minutes
   */
  getRateForPeriod(minutes: number): number {
    this.cleanBuffer();
    const periodStart = Date.now() - minutes * 60 * 1000;
    const periodErrors = this.errorBuffer.filter(
      (e) => e.timestamp.getTime() > periodStart
    );
    return periodErrors.length / minutes;
  }

  /**
   * Check if current error rate indicates a spike
   */
  checkForSpike(): ErrorSpike {
    const currentRate = this.getCurrentRate();
    
    // Calculate baseline from historical data
    if (this.baselineRate === 0) {
      this.baselineRate = Math.max(1, this.getRateForPeriod(30) / 30);
    }

    const multiplier = currentRate / this.baselineRate;
    const detected = multiplier >= this.SPIKE_THRESHOLD;

    if (detected) {
      logger.warn('Error rate spike detected', {
        currentRate,
        baselineRate: this.baselineRate,
        multiplier,
        componentName: 'ErrorMonitoring',
      });
    }

    return {
      detected,
      currentRate,
      baselineRate: this.baselineRate,
      multiplier,
    };
  }

  /**
   * Fetch error trends from database
   */
  async getErrorTrends(days: number = 7): Promise<ErrorTrend[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('error_logs')
        .select('severity, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by day
      const trendMap = new Map<string, ErrorTrend>();

      (data || []).forEach((log) => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        
        if (!trendMap.has(date)) {
          trendMap.set(date, {
            period: date,
            total: 0,
            critical: 0,
            error: 0,
            warning: 0,
            info: 0,
          });
        }

        const trend = trendMap.get(date)!;
        trend.total++;
        
        switch (log.severity) {
          case 'critical':
            trend.critical++;
            break;
          case 'error':
            trend.error++;
            break;
          case 'warning':
            trend.warning++;
            break;
          case 'info':
            trend.info++;
            break;
        }
      });

      return Array.from(trendMap.values());
    } catch (error) {
      logger.error('Failed to fetch error trends', error, {
        componentName: 'ErrorMonitoring',
      });
      return [];
    }
  }

  /**
   * Get top error-producing components
   */
  async getTopErrorComponents(limit: number = 10): Promise<{ component: string; count: number }[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('component_name')
        .not('component_name', 'is', null)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const componentCounts = new Map<string, number>();
      
      (data || []).forEach((log) => {
        const component = log.component_name || 'Unknown';
        componentCounts.set(component, (componentCounts.get(component) || 0) + 1);
      });

      return Array.from(componentCounts.entries())
        .map(([component, count]) => ({ component, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to fetch top error components', error, {
        componentName: 'ErrorMonitoring',
      });
      return [];
    }
  }

  /**
   * Get error resolution stats
   */
  async getResolutionStats(): Promise<{
    total: number;
    resolved: number;
    pending: number;
    resolutionRate: number;
    avgResolutionTimeHours: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('resolved, created_at, resolved_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const total = data?.length || 0;
      const resolved = data?.filter((d) => d.resolved).length || 0;
      const pending = total - resolved;
      const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;

      // Calculate average resolution time
      const resolvedWithTime = data?.filter((d) => d.resolved && d.resolved_at) || [];
      let avgResolutionTimeHours = 0;
      
      if (resolvedWithTime.length > 0) {
        const totalHours = resolvedWithTime.reduce((sum, d) => {
          const created = new Date(d.created_at).getTime();
          const resolvedAt = new Date(d.resolved_at!).getTime();
          return sum + (resolvedAt - created) / (1000 * 60 * 60);
        }, 0);
        avgResolutionTimeHours = totalHours / resolvedWithTime.length;
      }

      return {
        total,
        resolved,
        pending,
        resolutionRate,
        avgResolutionTimeHours,
      };
    } catch (error) {
      logger.error('Failed to fetch resolution stats', error, {
        componentName: 'ErrorMonitoring',
      });
      return {
        total: 0,
        resolved: 0,
        pending: 0,
        resolutionRate: 0,
        avgResolutionTimeHours: 0,
      };
    }
  }

  /**
   * Clean old entries from buffer
   */
  private cleanBuffer(): void {
    const cutoff = Date.now() - this.BUFFER_WINDOW_MS;
    this.errorBuffer = this.errorBuffer.filter(
      (e) => e.timestamp.getTime() > cutoff
    );
  }

  /**
   * Update baseline rate (call periodically)
   */
  updateBaseline(): void {
    this.baselineRate = Math.max(1, this.getRateForPeriod(60));
  }
}

// Singleton instance
export const errorMonitoring = new ErrorMonitoringService();

// Auto-update baseline every 30 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    errorMonitoring.updateBaseline();
  }, 30 * 60 * 1000);
}

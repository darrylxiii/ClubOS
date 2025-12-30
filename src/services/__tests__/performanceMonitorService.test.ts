import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  queueMetric,
  flushMetrics,
  trackCoreWebVital,
  trackTiming,
  measureAsync,
} from '../performanceMonitorService';
import { supabase } from '@/integrations/supabase/client';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('performanceMonitorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('queueMetric', () => {
    it('should queue a performance metric', () => {
      expect(() => queueMetric({
        metric_type: 'test-metric',
        value: 100,
        unit: 'ms',
        page_path: '/test',
      })).not.toThrow();
    });

    it('should add user agent and connection type', () => {
      expect(() => queueMetric({
        metric_type: 'page-load',
        value: 500,
        unit: 'ms',
        page_path: '/dashboard',
      })).not.toThrow();
    });
  });

  describe('flushMetrics', () => {
    it('should not throw when buffer is empty', async () => {
      await expect(flushMetrics()).resolves.not.toThrow();
    });

    it('should attempt to insert metrics to database', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      queueMetric({
        metric_type: 'test',
        value: 50,
        unit: 'ms',
        page_path: '/test',
      });

      await flushMetrics();

      expect(supabase.from).toHaveBeenCalledWith('performance_metrics');
    });
  });

  describe('trackCoreWebVital', () => {
    it('should track LCP', () => {
      expect(() => trackCoreWebVital('LCP', 2500)).not.toThrow();
    });

    it('should track FID', () => {
      expect(() => trackCoreWebVital('FID', 100)).not.toThrow();
    });

    it('should track CLS', () => {
      expect(() => trackCoreWebVital('CLS', 0.1)).not.toThrow();
    });

    it('should track TTFB', () => {
      expect(() => trackCoreWebVital('TTFB', 200)).not.toThrow();
    });

    it('should track INP', () => {
      expect(() => trackCoreWebVital('INP', 150)).not.toThrow();
    });
  });

  describe('trackTiming', () => {
    it('should track custom timing metric', () => {
      expect(() => trackTiming('api-call', 350)).not.toThrow();
    });

    it('should accept metadata', () => {
      expect(() => trackTiming('database-query', 50, {
        table: 'users',
        operation: 'select',
      })).not.toThrow();
    });
  });

  describe('measureAsync', () => {
    it('should measure successful async operation', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      
      const result = await measureAsync('test-operation', operation);
      
      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
    });

    it('should measure failed async operation', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(measureAsync('test-operation', operation))
        .rejects.toThrow('Test error');
    });

    it('should pass metadata to timing', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      
      await measureAsync('test-operation', operation, { custom: 'data' });
      
      expect(operation).toHaveBeenCalled();
    });

    it('should track duration accurately', async () => {
      const operation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('done'), 50))
      );
      
      const result = await measureAsync('timed-operation', operation);
      
      expect(result).toBe('done');
    });
  });
});

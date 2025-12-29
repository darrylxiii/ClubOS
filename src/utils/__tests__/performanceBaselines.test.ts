import { describe, it, expect } from 'vitest';
import {
  PERFORMANCE_THRESHOLDS,
  formatMetricValue,
  checkThreshold,
} from '../performanceBaselines';

describe('Performance Baselines', () => {
  describe('PERFORMANCE_THRESHOLDS', () => {
    it('should define LCP thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.LCP).toBeDefined();
      expect(PERFORMANCE_THRESHOLDS.LCP.warning).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP.critical);
    });

    it('should define FID thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.FID).toBeDefined();
      expect(PERFORMANCE_THRESHOLDS.FID.warning).toBeLessThan(PERFORMANCE_THRESHOLDS.FID.critical);
    });

    it('should define CLS thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.CLS).toBeDefined();
      expect(PERFORMANCE_THRESHOLDS.CLS.warning).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS.critical);
    });

    it('should define TTFB thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.TTFB).toBeDefined();
      expect(PERFORMANCE_THRESHOLDS.TTFB.warning).toBe(500);
    });

    it('should have consistent threshold structure', () => {
      Object.entries(PERFORMANCE_THRESHOLDS).forEach(([key, value]) => {
        expect(value).toHaveProperty('warning');
        expect(value).toHaveProperty('critical');
        expect(value).toHaveProperty('unit');
        expect(typeof value.warning).toBe('number');
        expect(typeof value.critical).toBe('number');
      });
    });
  });

  describe('formatMetricValue', () => {
    it('should format millisecond values correctly', () => {
      const result = formatMetricValue('lcp', 2500);
      expect(result).toContain('2500');
      expect(result).toContain('ms');
    });

    it('should format CLS values correctly', () => {
      const result = formatMetricValue('cls', 0.1);
      expect(result).toContain('0.1');
    });

    it('should handle unknown metric types gracefully', () => {
      const result = formatMetricValue('unknown_metric', 123);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle zero values', () => {
      const result = formatMetricValue('lcp', 0);
      expect(result).toContain('0');
    });
  });

  describe('checkThreshold', () => {
    it('should return "good" for values below warning threshold', () => {
      const result = checkThreshold('LCP', 1000);
      expect(result).toBe('good');
    });

    it('should return "warning" for values between warning and critical', () => {
      const result = checkThreshold('LCP', 3000);
      expect(result).toBe('warning');
    });

    it('should return "critical" for values above critical threshold', () => {
      const result = checkThreshold('LCP', 5000);
      expect(result).toBe('critical');
    });

    it('should handle CLS thresholds correctly', () => {
      expect(checkThreshold('CLS', 0.05)).toBe('good');
      expect(checkThreshold('CLS', 0.15)).toBe('warning');
      expect(checkThreshold('CLS', 0.3)).toBe('critical');
    });

    it('should return undefined for unknown metrics', () => {
      const result = checkThreshold('UNKNOWN_METRIC', 100);
      expect(result).toBeUndefined();
    });
  });

  describe('Threshold Values Alignment with Web Vitals', () => {
    it('should align LCP with Google recommendations', () => {
      expect(PERFORMANCE_THRESHOLDS.LCP.warning).toBeLessThanOrEqual(4000);
      expect(PERFORMANCE_THRESHOLDS.LCP.critical).toBeGreaterThanOrEqual(4000);
    });

    it('should align FID with Google recommendations', () => {
      expect(PERFORMANCE_THRESHOLDS.FID.warning).toBeLessThanOrEqual(300);
    });

    it('should align CLS with Google recommendations', () => {
      expect(PERFORMANCE_THRESHOLDS.CLS.warning).toBeLessThanOrEqual(0.25);
    });
  });
});

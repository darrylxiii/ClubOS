import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorMonitoring } from '../errorMonitoring';

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

describe('ErrorMonitoringService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordError', () => {
    it('should record an error occurrence', () => {
      expect(() => errorMonitoring.recordError('error')).not.toThrow();
    });
  });

  describe('getCurrentRate', () => {
    it('should return a number for current rate', () => {
      const rate = errorMonitoring.getCurrentRate();
      expect(typeof rate).toBe('number');
    });
  });

  describe('checkForSpike', () => {
    it('should return spike detection result', () => {
      const result = errorMonitoring.checkForSpike();
      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('currentRate');
    });
  });
});

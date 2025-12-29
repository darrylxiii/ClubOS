import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorMonitoringService } from '../errorMonitoring';

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

describe('ErrorMonitoringService', () => {
  let service: ErrorMonitoringService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ErrorMonitoringService();
  });

  describe('recordError', () => {
    it('should record an error occurrence', () => {
      expect(() => service.recordError('error')).not.toThrow();
    });
  });

  describe('getCurrentRate', () => {
    it('should return a number for current rate', () => {
      const rate = service.getCurrentRate();
      expect(typeof rate).toBe('number');
    });
  });

  describe('checkForSpike', () => {
    it('should return spike detection result', () => {
      const result = service.checkForSpike();
      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('currentRate');
    });
  });
});

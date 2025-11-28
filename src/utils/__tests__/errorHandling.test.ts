import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler, withRetry, safeAsync } from '../errorHandling';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error');
      const message = ErrorHandler.extractErrorMessage(error, 'Fallback');
      expect(message).toBe('Test error');
    });

    it('should extract message from object with message property', () => {
      const error = { message: 'Object error' };
      const message = ErrorHandler.extractErrorMessage(error, 'Fallback');
      expect(message).toBe('Object error');
    });

    it('should handle string errors', () => {
      const message = ErrorHandler.extractErrorMessage('String error', 'Fallback');
      expect(message).toBe('String error');
    });

    it('should return fallback for unknown errors', () => {
      const message = ErrorHandler.extractErrorMessage(null, 'Fallback');
      expect(message).toBe('Fallback');
    });
  });

  describe('handle', () => {
    it('should return error message', () => {
      const message = ErrorHandler.handle(new Error('Test'), { showToast: false });
      expect(message).toBe('Test');
    });

    it('should not throw by default', () => {
      expect(() => {
        ErrorHandler.handle(new Error('Test'), { showToast: false });
      }).not.toThrow();
    });

    it('should throw if throwError is true', () => {
      expect(() => {
        ErrorHandler.handle(new Error('Test'), { showToast: false, throwError: true });
      }).toThrow('Test');
    });
  });
});

describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const operation = vi.fn(async () => 'success');
    const result = await withRetry(operation, { retries: 3 });
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Fail');
      return 'success';
    });

    const result = await withRetry(operation, { retries: 3, delay: 10 });
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    const operation = vi.fn(async () => {
      throw new Error('Always fails');
    });

    await expect(withRetry(operation, { retries: 2, delay: 10 })).rejects.toThrow('Always fails');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('safeAsync', () => {
  it('should return result on success', async () => {
    const operation = async () => 'success';
    const result = await safeAsync(operation, 'fallback');
    expect(result).toBe('success');
  });

  it('should return fallback on error', async () => {
    const operation = async () => {
      throw new Error('Fail');
    };
    const result = await safeAsync(operation, 'fallback');
    expect(result).toBe('fallback');
  });
});

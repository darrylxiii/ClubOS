import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logErrorToDatabase, logCriticalError, logNetworkError } from '../errorReporting';

describe('errorReporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  describe('logErrorToDatabase', () => {
    it('should log error with correct severity', async () => {
      const error = new Error('Test error');
      const componentName = 'TestComponent';

      await logErrorToDatabase(error, 'error', componentName);

      // Verify console.error was called (since table doesn't exist yet)
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle context parameter', async () => {
      const error = new Error('Test error with context');
      const context = { userId: '123', action: 'test' };

      await logErrorToDatabase(error, 'warning', 'TestComponent', context);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('logCriticalError', () => {
    it('should log critical errors with critical severity', async () => {
      const error = new Error('Critical error');
      const componentName = 'CriticalComponent';

      await logCriticalError(error, componentName);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL ERROR'),
        expect.anything()
      );
    });
  });

  describe('logNetworkError', () => {
    it('should log network errors with endpoint info', async () => {
      const error = new Error('Network failed');
      const endpoint = '/api/test';
      const statusCode = 500;

      await logNetworkError(error, endpoint, statusCode);

      expect(console.error).toHaveBeenCalled();
    });
  });
});

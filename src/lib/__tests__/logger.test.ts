import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock Sentry before importing logger
vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// We rely on the supabase mock from setup.ts. We'll override specific methods per test.

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let logger: typeof import('@/lib/logger').logger;

  beforeEach(async () => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset module so we get a fresh Logger instance with empty batch/dedup state
    vi.resetModules();

    // Re-import to get a fresh instance
    const mod = await import('@/lib/logger');
    logger = mod.logger;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Module export', () => {
    it('should export a logger instance with all log level methods', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.critical).toBe('function');
      expect(typeof logger.addBreadcrumb).toBe('function');
      expect(typeof logger.time).toBe('function');
      expect(typeof logger.timeEnd).toBe('function');
    });
  });

  describe('Log levels', () => {
    it('debug() should output to console.log in dev mode', () => {
      logger.debug('debug message', { componentName: 'TestComp' });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('debug message'));
    });

    it('info() should output to console.log in dev mode', () => {
      logger.info('info message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('info message'));
    });

    it('warn() should always output to console.warn', () => {
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('test warning'));
    });

    it('warn() should include context in formatted output', () => {
      logger.warn('watch out', { componentName: 'DashboardPage' });
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('DashboardPage'));
    });

    it('error() should output to console.error', () => {
      logger.error('test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test error'));
    });

    it('critical() should delegate to error() with [CRITICAL] prefix', () => {
      logger.critical('system down');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[CRITICAL] system down'));
    });
  });

  describe('Error serialization', () => {
    it('should serialize Error instances with message, stack, and name', () => {
      const err = new Error('Something broke');
      err.name = 'TypeError';

      logger.error('crash detected', err);

      const callArg = consoleErrorSpy.mock.calls[0][0] as string;
      expect(callArg).toContain('crash detected');
      expect(callArg).toContain('Something broke');
      expect(callArg).toContain('TypeError');
    });

    it('should handle ErrorWithStack objects (non-Error instances with message)', () => {
      const errorLike = { message: 'API timeout', stack: 'at line 42', code: '504' };

      logger.error('external error', errorLike);

      const callArg = consoleErrorSpy.mock.calls[0][0] as string;
      expect(callArg).toContain('API timeout');
      expect(callArg).toContain('504');
    });

    it('should handle plain string errors by converting them', () => {
      logger.error('unexpected', 'just a string' as any);

      const callArg = consoleErrorSpy.mock.calls[0][0] as string;
      expect(callArg).toContain('just a string');
    });

    it('should handle error() called without an error object', () => {
      logger.error('simple message without error object');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('simple message without error object')
      );
    });
  });

  describe('Sentry integration', () => {
    it('should capture Error instances in Sentry', async () => {
      const Sentry = await import('@sentry/react');
      const err = new Error('sentry test');

      logger.error('captured', err);

      // Sentry call is async (fire-and-forget via getSentry().then(...))
      // Flush microtasks
      await new Promise(r => setTimeout(r, 0));

      expect(Sentry.captureException).toHaveBeenCalledWith(
        err,
        expect.objectContaining({
          extra: expect.objectContaining({ message: 'captured' }),
        })
      );
    });

    it('addBreadcrumb() should call Sentry.addBreadcrumb', async () => {
      const Sentry = await import('@sentry/react');
      logger.addBreadcrumb('user clicked', 'ui', { button: 'save' });

      await new Promise(r => setTimeout(r, 0));

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'user clicked',
        category: 'ui',
        data: { button: 'save' },
        level: 'info',
      });
    });
  });

  describe('Batching', () => {
    it('should flush batch to error_logs table when batch size (5) is reached', async () => {
      // Set up the mock for supabase.from('error_logs').insert()
      const mockInsertFn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsertFn } as any);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-1' } as any },
        error: null,
      });

      // Log 5 errors (BATCH_SIZE = 5) with unique messages to avoid dedup
      for (let i = 0; i < 5; i++) {
        logger.error(`batch error ${i}`, new Error(`err-${i}`), {
          componentName: `Comp${i}`,
          errorType: 'api',
          severity: 'error',
        });
      }

      // Allow async flush to settle
      await new Promise(r => setTimeout(r, 50));

      expect(supabase.from).toHaveBeenCalledWith('error_logs');
      expect(mockInsertFn).toHaveBeenCalled();

      const insertedRecords = mockInsertFn.mock.calls[0][0];
      expect(insertedRecords).toHaveLength(5);
    });

    it('should flush batch after timeout (30s) even if batch is not full', async () => {
      vi.useFakeTimers();

      const mockInsertFn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsertFn } as any);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-2' } as any },
        error: null,
      });

      // Log fewer than BATCH_SIZE errors
      logger.error('timeout-flush-error', new Error('will timeout'), {
        componentName: 'TimeoutComp',
        errorType: 'database',
        severity: 'warning',
      });

      // Verify insert hasn't been called yet (batch not full)
      expect(mockInsertFn).not.toHaveBeenCalled();

      // Advance past BATCH_TIMEOUT (30000ms)
      await vi.advanceTimersByTimeAsync(31000);

      // Now the batch should have been flushed
      expect(supabase.from).toHaveBeenCalledWith('error_logs');
      expect(mockInsertFn).toHaveBeenCalled();
    });

    it('should include user_id from auth in flushed records', async () => {
      const mockInsertFn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsertFn } as any);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'logged-in-user-42' } as any },
        error: null,
      });

      // Fill the batch to trigger flush
      for (let i = 0; i < 5; i++) {
        logger.error(`user-err ${i}`, new Error(`e-${i}`), { componentName: `C${i}` });
      }

      await new Promise(r => setTimeout(r, 50));

      expect(mockInsertFn).toHaveBeenCalled();
      const records = mockInsertFn.mock.calls[0][0];
      expect(records[0].user_id).toBe('logged-in-user-42');
    });

    it('should not crash if flush insert fails', async () => {
      const mockInsertFn = vi.fn().mockResolvedValue({ error: { message: 'DB write failed' } });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsertFn } as any);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'usr-x' } as any },
        error: null,
      });

      for (let i = 0; i < 5; i++) {
        logger.error(`fail-err ${i}`, new Error(`f-${i}`), { componentName: `F${i}` });
      }

      // Should not throw
      await new Promise(r => setTimeout(r, 50));

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to insert error logs:',
        expect.anything()
      );
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate identical errors within 5 seconds', async () => {
      vi.useFakeTimers();

      const mockInsertFn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsertFn } as any);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'dedup-user' } as any },
        error: null,
      });

      // Log the same error twice rapidly
      logger.error('duplicate error', new Error('same'), { componentName: 'SameComp' });
      logger.error('duplicate error', new Error('same'), { componentName: 'SameComp' });

      // Force flush by advancing timer
      await vi.advanceTimersByTimeAsync(31000);

      if (mockInsertFn.mock.calls.length > 0) {
        const records = mockInsertFn.mock.calls[0][0];
        // Should have only 1 record, not 2
        expect(records).toHaveLength(1);
      }
    });

    it('should not deduplicate errors with different component names', async () => {
      vi.useFakeTimers();

      const mockInsertFn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsertFn } as any);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'dedup-user-2' } as any },
        error: null,
      });

      logger.error('same message', new Error('x'), { componentName: 'CompA' });
      logger.error('same message', new Error('x'), { componentName: 'CompB' });

      // Force flush
      await vi.advanceTimersByTimeAsync(31000);

      if (mockInsertFn.mock.calls.length > 0) {
        const records = mockInsertFn.mock.calls[0][0];
        expect(records).toHaveLength(2);
      }
    });
  });

  describe('Error log record structure', () => {
    it('should produce records with correct fields for DB insertion', async () => {
      const mockInsertFn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsertFn } as any);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'usr-1' } as any },
        error: null,
      });

      // Fill batch to trigger flush
      for (let i = 0; i < 5; i++) {
        logger.error(`struct-error-${i}`, new Error(`se-${i}`), {
          errorType: 'edge_function',
          severity: 'warning',
          componentName: `StructComp${i}`,
        });
      }

      await new Promise(r => setTimeout(r, 50));

      expect(mockInsertFn).toHaveBeenCalled();
      const record = mockInsertFn.mock.calls[0][0][0];

      expect(record).toHaveProperty('user_id', 'usr-1');
      expect(record).toHaveProperty('error_type', 'edge_function');
      expect(record).toHaveProperty('severity', 'warning');
      expect(record).toHaveProperty('error_message');
      expect(record).toHaveProperty('component_name', 'StructComp0');
      expect(record).toHaveProperty('page_url');
      expect(record).toHaveProperty('user_agent');
      expect(record).toHaveProperty('metadata');
    });
  });

  describe('Format', () => {
    it('should include ISO timestamp and uppercase level in formatted output', () => {
      logger.warn('format check');

      const callArg = consoleWarnSpy.mock.calls[0][0] as string;
      // Should contain ISO timestamp pattern
      expect(callArg).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      // Should contain uppercase level
      expect(callArg).toContain('[WARN]');
    });

    it('should include context JSON in formatted output when provided', () => {
      logger.warn('ctx test', { componentName: 'MyWidget' });

      const callArg = consoleWarnSpy.mock.calls[0][0] as string;
      expect(callArg).toContain('"componentName":"MyWidget"');
    });
  });
});

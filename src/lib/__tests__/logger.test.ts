import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Sentry before importing logger
vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export a logger instance', async () => {
    const { logger } = await import('@/lib/logger');
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.critical).toBe('function');
  });

  it('warn() should always output to console.warn', async () => {
    const { logger } = await import('@/lib/logger');
    logger.warn('test warning');
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('test warning'));
  });

  it('error() should output to console.error', async () => {
    const { logger } = await import('@/lib/logger');
    logger.error('test error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test error'));
  });

  it('error() should capture Error instances in Sentry', async () => {
    const Sentry = await import('@sentry/react');
    const { logger } = await import('@/lib/logger');
    const err = new Error('sentry test');

    logger.error('captured', err);

    expect(Sentry.captureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        extra: expect.objectContaining({ message: 'captured' }),
      })
    );
  });

  it('critical() should delegate to error() with critical severity', async () => {
    const { logger } = await import('@/lib/logger');
    logger.critical('system down');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[CRITICAL] system down'));
  });

  it('addBreadcrumb() should call Sentry.addBreadcrumb', async () => {
    const Sentry = await import('@sentry/react');
    const { logger } = await import('@/lib/logger');
    logger.addBreadcrumb('user clicked', 'ui', { button: 'save' });

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'user clicked',
      category: 'ui',
      data: { button: 'save' },
      level: 'info',
    });
  });
});

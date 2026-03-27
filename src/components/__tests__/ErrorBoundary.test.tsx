import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// ---- Mocks ----
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
    addBreadcrumb: vi.fn(),
  },
}));

vi.mock('@/utils/errorReporting', () => ({
  logCriticalError: vi.fn(),
  logErrorToDatabase: vi.fn(),
}));

// ---- Helpers ----

/** A component that throws on render. */
function ThrowingChild({ error }: { error: Error }) {
  throw error;
}

/** A component that renders normally. */
function GoodChild() {
  return <div data-testid="child-content">Hello from child</div>;
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress noisy React/jsdom error output during intentional throws
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------
  describe('when children render normally', () => {
    it('should render children without error UI', () => {
      render(
        <ErrorBoundary>
          <GoodChild />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-content')).toBeTruthy();
      expect(screen.getByText('Hello from child')).toBeTruthy();
    });

    it('should NOT display the error fallback', () => {
      render(
        <ErrorBoundary>
          <GoodChild />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Application Error')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Error catching
  // ---------------------------------------------------------------------------
  describe('when a child component throws', () => {
    it('should catch the error and render fallback UI', () => {
      const testError = new Error('Test crash');

      render(
        <ErrorBoundary>
          <ThrowingChild error={testError} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Application Error')).toBeTruthy();
    });

    it('should display the error name', () => {
      const testError = new Error('Something broke');
      testError.name = 'TypeError';

      render(
        <ErrorBoundary>
          <ThrowingChild error={testError} />
        </ErrorBoundary>
      );

      expect(screen.getByText('TypeError')).toBeTruthy();
    });

    it('should display the error message', () => {
      const testError = new Error('Connection timeout');

      render(
        <ErrorBoundary>
          <ThrowingChild error={testError} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Connection timeout')).toBeTruthy();
    });

    it('should display the error stack in a details element', () => {
      const testError = new Error('Stack trace test');

      render(
        <ErrorBoundary>
          <ThrowingChild error={testError} />
        </ErrorBoundary>
      );

      // The stack should be inside a <details> with summary "Error Stack"
      expect(screen.getByText('Error Stack')).toBeTruthy();
    });

    it('should render a "Reload Application" button', () => {
      render(
        <ErrorBoundary>
          <ThrowingChild error={new Error('crash')} />
        </ErrorBoundary>
      );

      const button = screen.getByText('Reload Application');
      expect(button).toBeTruthy();
      expect(button.tagName).toBe('BUTTON');
    });
  });

  // ---------------------------------------------------------------------------
  // Error logging
  // ---------------------------------------------------------------------------
  describe('error logging', () => {
    it('should call logCriticalError with the error and component name', async () => {
      const { logCriticalError } = await import('@/utils/errorReporting');
      const testError = new Error('Critical failure');

      render(
        <ErrorBoundary>
          <ThrowingChild error={testError} />
        </ErrorBoundary>
      );

      expect(logCriticalError).toHaveBeenCalledWith(
        testError,
        'ErrorBoundary',
        expect.objectContaining({
          errorType: 'react',
        })
      );
    });

    it('should call logger.error with error details', async () => {
      const { logger } = await import('@/lib/logger');
      const testError = new Error('Logger test');

      render(
        <ErrorBoundary>
          <ThrowingChild error={testError} />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'React Error Boundary',
        testError,
        expect.objectContaining({
          errorType: 'react',
          severity: 'error',
          componentName: 'ErrorBoundary',
        })
      );
    });

    it('should log to console.error', () => {
      const testError = new Error('Console test');

      render(
        <ErrorBoundary>
          <ThrowingChild error={testError} />
        </ErrorBoundary>
      );

      // componentDidCatch calls console.error multiple times
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Recovery mechanism
  // ---------------------------------------------------------------------------
  describe('recovery mechanism', () => {
    it('should navigate to /home when the Reload button is clicked', () => {
      // We need to track the href assignment
      const hrefSetter = vi.fn();
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          get href() {
            return '';
          },
          set href(val: string) {
            hrefSetter(val);
          },
        },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowingChild error={new Error('recoverable')} />
        </ErrorBoundary>
      );

      const button = screen.getByText('Reload Application');
      fireEvent.click(button);

      expect(hrefSetter).toHaveBeenCalledWith('/home');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should handle errors without a stack trace', () => {
      const testError = new Error('no stack');
      testError.stack = undefined;

      render(
        <ErrorBoundary>
          <ThrowingChild error={testError} />
        </ErrorBoundary>
      );

      // Should still render fallback UI
      expect(screen.getByText('Application Error')).toBeTruthy();
      expect(screen.getByText('no stack')).toBeTruthy();
      // "Error Stack" details should not appear since stack is undefined
      expect(screen.queryByText('Error Stack')).toBeNull();
    });

    it('should display default message for errors without a message', () => {
      const testError = new Error();

      render(
        <ErrorBoundary>
          <ThrowingChild error={testError} />
        </ErrorBoundary>
      );

      // The fallback uses: this.state.error?.message || "An unexpected error occurred"
      // Empty string is falsy, so it should show default
      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });

    it('should use inline styles (no CSS dependency)', () => {
      render(
        <ErrorBoundary>
          <ThrowingChild error={new Error('style test')} />
        </ErrorBoundary>
      );

      const button = screen.getByText('Reload Application');
      // The button should have inline styles (backgroundColor)
      expect(button.style.backgroundColor).toBeTruthy();
    });
  });
});

import { useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react';

/**
 * Hook to create a Sentry transaction for page/component performance tracking
 */
export const useSentryTransaction = (name: string, op: string = 'pageload') => {
  const spanRef = useRef<ReturnType<typeof Sentry.startInactiveSpan> | null>(null);

  useEffect(() => {
    spanRef.current = Sentry.startInactiveSpan({ name, op });
    
    return () => {
      if (spanRef.current) {
        spanRef.current.end();
      }
    };
  }, [name, op]);

  const startSpan = (spanName: string, spanOp: string = 'function') => {
    return Sentry.startInactiveSpan({ name: spanName, op: spanOp });
  };

  const setTag = (key: string, value: string) => {
    Sentry.setTag(key, value);
  };

  const setData = (key: string, value: unknown) => {
    Sentry.setExtra(key, value);
  };

  return { startSpan, setTag, setData };
};

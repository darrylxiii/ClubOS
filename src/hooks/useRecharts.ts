/**
 * useRecharts - Hook for lazy-loading recharts to avoid build OOM issues
 * 
 * Usage:
 * const { recharts, isLoading } = useRecharts();
 * if (isLoading || !recharts) return <Skeleton />;
 * const { LineChart, Line, XAxis, YAxis } = recharts;
 */
import { useState, useEffect } from 'react';

type RechartsModule = typeof import('recharts');

interface UseRechartsResult {
  recharts: RechartsModule | null;
  isLoading: boolean;
}

export function useRecharts(): UseRechartsResult {
  const [recharts, setRecharts] = useState<RechartsModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    import('recharts')
      .then((mod) => {
        if (mounted) {
          setRecharts(mod);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load recharts:', err);
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { recharts, isLoading };
}

export default useRecharts;

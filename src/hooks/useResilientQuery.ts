/**
 * useResilientQuery Hook
 * React Query wrapper with full resilience stack
 */

import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { resilientRequest, type ResilientRequestConfig } from '@/lib/resilience';

interface UseResilientQueryOptions<TData, TError = Error>
  extends Omit<UseQueryOptions<TData, TError, TData, readonly unknown[]>, 'queryFn'> {
  queryFn: () => Promise<TData>;
  resilience?: Omit<ResilientRequestConfig<TData>, 'cacheKey'>;
}

export function useResilientQuery<TData, TError = Error>(
  options: UseResilientQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  const { queryFn, resilience, queryKey, ...queryOptions } = options;

  // Generate cache key from query key
  const cacheKey = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);

  return useQuery({
    queryKey,
    queryFn: () =>
      resilientRequest(queryFn, {
        ...resilience,
        cacheKey,
        circuitName: resilience?.circuitName ?? cacheKey,
      }),
    ...queryOptions,
  });
}

/**
 * Convenience hook for Supabase queries with resilience
 */
export function useResilientSupabaseQuery<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<{ data: TData | null; error: Error | null }>,
  options?: {
    resilience?: Omit<ResilientRequestConfig<TData>, 'cacheKey'>;
    fallbackData?: TData;
  } & Omit<UseQueryOptions<TData, Error, TData, readonly unknown[]>, 'queryFn' | 'queryKey'>
): UseQueryResult<TData, Error> {
  const { resilience, fallbackData, ...queryOptions } = options ?? {};

  return useResilientQuery<TData, Error>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) throw error;
      if (data === null) throw new Error('No data returned');
      return data;
    },
    resilience: {
      ...resilience,
      fallbackValue: fallbackData,
      circuitName: `supabase:${queryKey[0]}`,
    },
    ...queryOptions,
  });
}

/**
 * Query timeout utility to prevent indefinite loading states
 * Wraps Supabase queries with a configurable timeout
 */

export const queryWithTimeout = async <T>(
  queryPromise: Promise<T>,
  timeoutMs: number = 10000
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
  );

  return Promise.race([queryPromise, timeoutPromise]);
};

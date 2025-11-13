/**
 * Resilient Query Utility
 * Wraps database queries with timeout and fallback mechanisms
 */

export const resilientQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  fallback: T,
  timeoutMs: number = 5000
): Promise<{ data: T; error: any }> => {
  try {
    const result = await Promise.race([
      queryFn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      )
    ]);
    
    if (result.error) {
      console.error('[Resilient Query] Error:', result.error);
      return { data: fallback, error: result.error };
    }
    
    return { data: result.data || fallback, error: null };
  } catch (err) {
    console.error('[Resilient Query] Timeout or exception:', err);
    return { data: fallback, error: err };
  }
};

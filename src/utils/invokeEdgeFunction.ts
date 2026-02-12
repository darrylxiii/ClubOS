import { supabase } from '@/integrations/supabase/client';

/**
 * Wrapper around supabase.functions.invoke that checks the edge function registry
 * cache before invoking. If a function is disabled by an admin, the call is skipped
 * client-side and a standardized error is returned.
 */
export async function invokeEdgeFunction(
  functionName: string,
  options?: { body?: unknown; headers?: Record<string, string> }
) {
  // Dynamically import to avoid circular dependencies
  const { QueryClient } = await import('@tanstack/react-query');

  // Try to get the cached registry from any active QueryClient
  // We check window.__QUERY_CLIENT__ which is set in App.tsx
  const queryClient = (window as any).__QUERY_CLIENT__ as InstanceType<typeof QueryClient> | undefined;

  if (queryClient) {
    const registry = queryClient.getQueryData(['edge-function-registry']) as
      | Array<{ function_name: string; is_active: boolean | null }>
      | undefined;

    const entry = registry?.find(e => e.function_name === functionName);

    if (entry && entry.is_active === false) {
      console.warn(`[EdgeFunction] ${functionName} is disabled by admin`);
      return { data: null, error: { message: 'Function disabled by admin' } };
    }
  }

  return supabase.functions.invoke(functionName, options);
}

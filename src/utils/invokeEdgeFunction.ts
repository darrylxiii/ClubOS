import { supabase } from '@/integrations/supabase/client';

/**
 * Circuit breaker state per function (in-memory).
 * States: CLOSED (normal) → OPEN (reject calls) → HALF_OPEN (allow 1 test call)
 */
interface CircuitState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  errorCount: number;
  lastErrorAt: number;
  openedAt: number;
}

const circuitBreakers = new Map<string, CircuitState>();
const lastCallTimestamps = new Map<string, number>();

const CIRCUIT_ERROR_THRESHOLD = 5;
const CIRCUIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const CIRCUIT_OPEN_DURATION_MS = 60 * 1000; // 60s before half-open

function getCircuit(name: string): CircuitState {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, { state: 'CLOSED', errorCount: 0, lastErrorAt: 0, openedAt: 0 });
  }
  return circuitBreakers.get(name)!;
}

function recordSuccess(name: string) {
  const circuit = getCircuit(name);
  circuit.state = 'CLOSED';
  circuit.errorCount = 0;
}

function recordError(name: string) {
  const circuit = getCircuit(name);
  const now = Date.now();

  // Reset error count if outside window
  if (now - circuit.lastErrorAt > CIRCUIT_WINDOW_MS) {
    circuit.errorCount = 0;
  }

  circuit.errorCount++;
  circuit.lastErrorAt = now;

  if (circuit.errorCount >= CIRCUIT_ERROR_THRESHOLD) {
    circuit.state = 'OPEN';
    circuit.openedAt = now;
    console.warn(`[CircuitBreaker] ${name} tripped OPEN after ${circuit.errorCount} errors`);
  }
}

function checkCircuit(name: string): { allowed: boolean; reason?: string } {
  const circuit = getCircuit(name);
  const now = Date.now();

  if (circuit.state === 'CLOSED') return { allowed: true };

  if (circuit.state === 'OPEN') {
    if (now - circuit.openedAt >= CIRCUIT_OPEN_DURATION_MS) {
      circuit.state = 'HALF_OPEN';
      return { allowed: true }; // Allow one test call
    }
    return { allowed: false, reason: 'Circuit breaker OPEN — too many recent errors' };
  }

  // HALF_OPEN — allow the test call (already set)
  return { allowed: true };
}

/**
 * Enhanced wrapper around supabase.functions.invoke with:
 * - Admin disable check (from cached registry)
 * - Smart sampling (skip non-critical calls randomly)
 * - Time-window throttling (min interval between calls)
 * - Circuit breaker (stop calling failing functions)
 */
export async function invokeEdgeFunction(
  functionName: string,
  options?: { body?: unknown; headers?: Record<string, string> }
) {
  const { QueryClient } = await import('@tanstack/react-query');
  const queryClient = (window as any).__QUERY_CLIENT__ as InstanceType<typeof QueryClient> | undefined;

  if (queryClient) {
    const registry = queryClient.getQueryData(['edge-function-registry']) as
      | Array<{
          function_name: string;
          is_active: boolean | null;
          sampling_rate: number | null;
          min_call_interval_ms: number | null;
        }>
      | undefined;

    const entry = registry?.find(e => e.function_name === functionName);

    if (entry) {
      // 1. Admin disable check
      if (entry.is_active === false) {
        console.warn(`[EdgeFunction] ${functionName} is disabled by admin`);
        return { data: null, error: { message: 'Function disabled by admin' } };
      }

      // 2. Smart sampling — skip randomly based on sampling_rate
      const samplingRate = entry.sampling_rate ?? 1.0;
      if (samplingRate < 1.0 && Math.random() > samplingRate) {
        console.debug(`[EdgeFunction] ${functionName} skipped by sampling (rate: ${samplingRate})`);
        return { data: null, error: null };
      }

      // 3. Time-window throttling
      const minInterval = entry.min_call_interval_ms ?? 0;
      if (minInterval > 0) {
        const lastCall = lastCallTimestamps.get(functionName) ?? 0;
        const elapsed = Date.now() - lastCall;
        if (elapsed < minInterval) {
          console.debug(`[EdgeFunction] ${functionName} throttled (${elapsed}ms < ${minInterval}ms)`);
          return { data: null, error: null };
        }
      }
    }
  }

  // 4. Circuit breaker check
  const circuitCheck = checkCircuit(functionName);
  if (!circuitCheck.allowed) {
    console.warn(`[EdgeFunction] ${functionName} blocked: ${circuitCheck.reason}`);
    return { data: null, error: { message: circuitCheck.reason } };
  }

  // Record call timestamp
  lastCallTimestamps.set(functionName, Date.now());

  // Execute
  const result = await supabase.functions.invoke(functionName, options);

  // Track circuit breaker outcome
  if (result.error) {
    recordError(functionName);
  } else {
    recordSuccess(functionName);
  }

  return result;
}

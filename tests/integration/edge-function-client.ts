/**
 * Edge Function Integration Test Client
 * Provides utilities for testing Supabase Edge Functions
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dpjucecmoyfzrduhlctt.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanVjZWNtb3lmenJkdWhsY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc2MTAsImV4cCI6MjA3NTAwMzYxMH0.hdX709NlaXPUE4ohWtd3LBuAOqPKCBhVep694LC6tRw';

export interface EdgeFunctionResponse<T = unknown> {
  data: T | null;
  error: Error | null;
  status: number;
  headers: Headers;
}

export interface EdgeFunctionOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  authToken?: string;
}

/**
 * Invoke a Supabase Edge Function for testing
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options: EdgeFunctionOptions = {}
): Promise<EdgeFunctionResponse<T>> {
  const { body, headers = {}, method = 'POST', authToken } = options;

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...headers,
  };

  if (authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: T | null = null;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    }

    return {
      data,
      error: response.ok ? null : new Error(`HTTP ${response.status}`),
      status: response.status,
      headers: response.headers,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 0,
      headers: new Headers(),
    };
  }
}

/**
 * Test that an edge function returns expected status
 */
export async function expectStatus(
  functionName: string,
  expectedStatus: number,
  options: EdgeFunctionOptions = {}
): Promise<void> {
  const response = await invokeEdgeFunction(functionName, options);
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status} for ${functionName}`
    );
  }
}

/**
 * Test that an edge function returns a successful response
 */
export async function expectSuccess<T>(
  functionName: string,
  options: EdgeFunctionOptions = {}
): Promise<T> {
  const response = await invokeEdgeFunction<T>(functionName, options);
  if (response.error || response.status >= 400) {
    throw new Error(
      `Expected success but got error for ${functionName}: ${response.error?.message || response.status}`
    );
  }
  return response.data as T;
}

/**
 * Test that an edge function returns an error
 */
export async function expectError(
  functionName: string,
  options: EdgeFunctionOptions = {}
): Promise<EdgeFunctionResponse> {
  const response = await invokeEdgeFunction(functionName, options);
  if (!response.error && response.status < 400) {
    throw new Error(`Expected error but got success for ${functionName}`);
  }
  return response;
}

/**
 * Measure response time for an edge function
 */
export async function measureResponseTime(
  functionName: string,
  options: EdgeFunctionOptions = {}
): Promise<{ response: EdgeFunctionResponse; durationMs: number }> {
  const start = performance.now();
  const response = await invokeEdgeFunction(functionName, options);
  const durationMs = performance.now() - start;
  return { response, durationMs };
}

/**
 * Test rate limiting by making multiple requests
 */
export async function testRateLimit(
  functionName: string,
  requestCount: number,
  options: EdgeFunctionOptions = {}
): Promise<{ successCount: number; rateLimitedCount: number }> {
  let successCount = 0;
  let rateLimitedCount = 0;

  const requests = Array.from({ length: requestCount }, () =>
    invokeEdgeFunction(functionName, options)
  );

  const responses = await Promise.all(requests);

  for (const response of responses) {
    if (response.status === 429) {
      rateLimitedCount++;
    } else if (response.status < 400) {
      successCount++;
    }
  }

  return { successCount, rateLimitedCount };
}

/**
 * Get a test auth token for authenticated requests
 */
export async function getTestAuthToken(): Promise<string | null> {
  // This would need to be implemented with actual auth
  // For now, return null to test public endpoints
  return null;
}

export default {
  invokeEdgeFunction,
  expectStatus,
  expectSuccess,
  expectError,
  measureResponseTime,
  testRateLimit,
  getTestAuthToken,
};

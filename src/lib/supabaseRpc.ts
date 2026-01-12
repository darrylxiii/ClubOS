/**
 * Typed RPC wrapper for Supabase function calls
 * Provides type safety for edge function invocations
 */

import { supabase } from "@/integrations/supabase/client";

// ============= Response Types =============

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface BackfillResult {
  found: number;
  created: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
  invoiceMatches?: number;
  wouldCreate?: unknown[];
  errorDetails?: Array<{ application_id?: string; id?: string; error: string }>;
}

interface CommissionCalculationResult {
  processed: number;
  created: number;
  skipped: number;
  errors: string[];
}

// ============= Edge Function Parameters =============

interface BackfillPlacementFeesParams {
  dryRun?: boolean;
}

interface CalculateRecruiterCommissionsParams {
  placementFeeId?: string;
  employeeId?: string;
  dryRun?: boolean;
}

interface CheckDataIntegrityParams {
  tables?: string[];
  autoFix?: boolean;
}

// ============= Typed Invoke Functions =============

/**
 * Invoke the backfill-placement-fees edge function
 */
export async function backfillPlacementFees(
  params: BackfillPlacementFeesParams = {}
): Promise<ApiResponse<BackfillResult>> {
  const { data, error } = await supabase.functions.invoke<ApiResponse<BackfillResult>>(
    'backfill-placement-fees',
    { body: params }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return data || { success: false, error: 'No response from function' };
}

/**
 * Invoke the calculate-recruiter-commissions edge function
 */
export async function calculateRecruiterCommissions(
  params: CalculateRecruiterCommissionsParams = {}
): Promise<ApiResponse<CommissionCalculationResult>> {
  const { data, error } = await supabase.functions.invoke<ApiResponse<CommissionCalculationResult>>(
    'calculate-recruiter-commissions',
    { body: params }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return data || { success: false, error: 'No response from function' };
}

/**
 * Invoke the check-data-integrity edge function
 */
export async function checkDataIntegrity(
  params: CheckDataIntegrityParams = {}
): Promise<ApiResponse<{ issues: unknown[]; fixed: number }>> {
  const { data, error } = await supabase.functions.invoke(
    'check-data-integrity',
    { body: params }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return data || { success: false, error: 'No response from function' };
}

/**
 * Generic typed invoke for any edge function
 */
export async function invokeEdgeFunction<TParams, TResult>(
  functionName: string,
  params?: TParams
): Promise<ApiResponse<TResult>> {
  const { data, error } = await supabase.functions.invoke<ApiResponse<TResult>>(
    functionName,
    params ? { body: params } : undefined
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return data || { success: false, error: 'No response from function' };
}

// ============= Helper for RPC calls =============

/**
 * Typed wrapper for Supabase RPC calls
 * Replaces (supabase as any).rpc() with proper typing
 */
export async function typedRpc<TResult>(
  functionName: string,
  params?: Record<string, unknown>
): Promise<{ data: TResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc(functionName as never, params as never);
    return { data: data as TResult, error };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
}

// ============= Helper for untyped table queries =============

/**
 * Query builder for tables not in generated types
 * Centralizes the type bypass pattern for better maintainability
 * Usage: untypedTable('my_table').select('*').eq('id', 1)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function untypedTable(tableName: string): any {
  return (supabase as unknown as any).from(tableName);
}

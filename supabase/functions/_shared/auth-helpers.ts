/**
 * Server-Side Authentication & Authorization Helpers
 * Phase 2 & 3: Edge Function Security Audit + Role Authorization Hardening
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export type UserRole = 'admin' | 'partner' | 'strategist' | 'candidate' | 'finance';

export interface AuthContext {
  userId: string;
  email: string;
  roles: UserRole[];
}

/**
 * Verify JWT token and return user context
 * Throws error if authentication fails
 */
export async function authenticateUser(authHeader: string | null): Promise<AuthContext> {
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  // Fetch user roles using service role to bypass RLS
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (roleError) {
    console.error('[Auth] Failed to fetch roles:', roleError);
    throw new Error('Failed to fetch user roles');
  }

  const roles = (roleData || []).map(r => r.role as UserRole);

  return {
    userId: user.id,
    email: user.email || '',
    roles
  };
}

/**
 * Verify user has at least one of the required roles
 * Server-side authorization check to prevent privilege escalation
 */
export function requireRole(context: AuthContext, allowedRoles: UserRole[]): void {
  const hasRole = context.roles.some(role => allowedRoles.includes(role));
  
  if (!hasRole) {
    throw new Error(`Unauthorized. Required roles: ${allowedRoles.join(', ')}`);
  }
}

/**
 * Check if user has admin role
 */
export function isAdmin(context: AuthContext): boolean {
  return context.roles.includes('admin');
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(context: AuthContext, roles: UserRole[]): boolean {
  return context.roles.some(role => roles.includes(role));
}

/**
 * Verify API key for public API endpoints
 * Uses api_keys table for validation
 */
export async function verifyApiKey(apiKey: string | null): Promise<{ companyId: string; scopes: string[] }> {
  if (!apiKey) {
    throw new Error('Missing API key');
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: keyData, error } = await supabaseAdmin
    .from('api_keys')
    .select('company_id, scopes, is_active, expires_at')
    .eq('key_prefix', apiKey.substring(0, 8))
    .single();

  if (error || !keyData) {
    throw new Error('Invalid API key');
  }

  if (!keyData.is_active) {
    throw new Error('API key is inactive');
  }

  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    throw new Error('API key has expired');
  }

  // Update last_used_at
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_prefix', apiKey.substring(0, 8));

  return {
    companyId: keyData.company_id,
    scopes: keyData.scopes || []
  };
}

/**
 * Create standardized error response
 */
export function createAuthErrorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ 
      error: message,
      code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

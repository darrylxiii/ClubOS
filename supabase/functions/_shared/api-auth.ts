import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

export interface APIAuthResult {
  authenticated: boolean;
  apiKeyId?: string;
  companyId?: string;
  scopes?: string[];
  rateLimitExceeded?: boolean;
  error?: string;
}

export async function authenticateAPIKey(
  authHeader: string | null
): Promise<APIAuthResult> {
  if (!authHeader) {
    return { authenticated: false, error: 'Missing Authorization header' };
  }

  // Extract API key from header (format: "Bearer tqc_live_...")
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { authenticated: false, error: 'Invalid Authorization header format' };
  }

  const apiKey = parts[1];
  
  // Validate key format
  if (!apiKey.startsWith('tqc_live_')) {
    return { authenticated: false, error: 'Invalid API key format' };
  }

  // Extract prefix (first 15 chars: "tqc_live_" + first 6 chars of random)
  const keyPrefix = apiKey.substring(0, 15);

  // Hash the full key for lookup
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Lookup key in database
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: apiKeyData, error: keyError } = await supabase
    .from('api_keys')
    .select('id, company_id, scopes, rate_limit_per_hour, is_active, expires_at')
    .eq('key_prefix', keyPrefix)
    .eq('key_hash', keyHash)
    .single();

  if (keyError || !apiKeyData) {
    return { authenticated: false, error: 'Invalid API key' };
  }

  // Check if key is active
  if (!apiKeyData.is_active) {
    return { authenticated: false, error: 'API key is disabled' };
  }

  // Check if key is expired
  if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
    return { authenticated: false, error: 'API key has expired' };
  }

  // Check rate limit
  const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
    p_api_key_id: apiKeyData.id,
    p_limit: apiKeyData.rate_limit_per_hour,
  });

  if (!rateLimitCheck) {
    return {
      authenticated: false,
      rateLimitExceeded: true,
      error: 'Rate limit exceeded',
    };
  }

  // Update last used timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyData.id);

  return {
    authenticated: true,
    apiKeyId: apiKeyData.id,
    companyId: apiKeyData.company_id,
    scopes: apiKeyData.scopes as string[],
  };
}

export async function logAPIUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string
) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  await supabase.from('api_usage_logs').insert({
    api_key_id: apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
    ip_address: ipAddress,
    user_agent: userAgent,
    error_message: errorMessage,
  });
}

export function hasScope(scopes: string[], requiredScope: string): boolean {
  return scopes.includes(requiredScope) || scopes.includes('*');
}

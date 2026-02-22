import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getAuthCorsHeaders, authCorsPreFlight } from "../_shared/auth-cors.ts";

const requestSchema = z.object({
  token: z.string(),
  new_password: z.string().min(12),
  confirm_password: z.string(),
  csrf_nonce: z.string().optional(),
});

// Common password patterns to reject
const COMMON_PATTERNS = [
  /^[A-Z][a-z]+\d{2,4}[!@#$%^&*]$/,   // "Password123!"
  /^(password|welcome|admin|quantum|letmein|changeme|abc123|qwerty)/i,
  /(.)\1{3,}/,                           // 4+ repeated chars "aaaa"
  /^(abc|123|qwerty|asdf)/i,
  /^[A-Z][a-z]+(19|20)\d{2}[!@#$%^&*]$/, // "Quantum2024!"
];

function hasCommonPattern(password: string): boolean {
  return COMMON_PATTERNS.some(p => p.test(password));
}

async function hashValue(value: string, saltHex?: string): Promise<string> {
  let saltBytes: Uint8Array;
  if (saltHex) {
    saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  } else {
    saltBytes = crypto.getRandomValues(new Uint8Array(16));
  }
  const computedSaltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${computedSaltHex}:${hashHex}`;
}

async function verifyValue(value: string, stored: string): Promise<boolean> {
  if (!stored.includes(':')) return false;
  const [saltHex] = stored.split(':');
  const reHashed = await hashValue(value, saltHex);
  return reHashed === stored;
}

async function checkAndRaiseAlert(supabaseAdmin: any, email: string, clientIp: string, correlationId: string | null) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin.from('password_reset_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email).eq('success', false)
    .in('attempt_type', ['validate_otp', 'validate_token', 'set_password'])
    .gte('attempted_at', oneHourAgo);
  if (count && count >= 3) {
    await supabaseAdmin.from('security_alerts').insert({
      alert_type: 'password_reset_brute_force', email, ip_address: clientIp,
      details: { failed_attempts: count, correlation_id: correlationId, stage: 'set_password' },
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return authCorsPreFlight(req);

  const corsHeaders = getAuthCorsHeaders(req);

  try {
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const body = await req.json();
    const { token, new_password, confirm_password, csrf_nonce } = requestSchema.parse(body);
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    if (new_password !== confirm_password) {
      return new Response(JSON.stringify({ error: "Passwords do not match" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Dictionary/pattern check
    if (hasCommonPattern(new_password)) {
      return new Response(
        JSON.stringify({ weak_password: true, error: "This password follows a common pattern that is easily guessable. Please choose something more unique." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: tokens, error: lookupError } = await supabaseAdmin.from('password_reset_tokens')
      .select('*').eq('magic_token', token).eq('is_used', true)
      .gt('used_at', fifteenMinAgo).in('validated_by', ['otp', 'magic_link']).limit(1);
    if (lookupError) throw lookupError;

    const resetToken = tokens?.[0];
    const correlationId = resetToken?.correlation_id || null;

    // Log CSRF nonce for forensic tracing
    if (csrf_nonce) {
      console.log(`[PasswordReset][${correlationId}][set_password] CSRF nonce: ${csrf_nonce.substring(0, 8)}...`);
    }

    if (!resetToken) {
      await supabaseAdmin.from('password_reset_attempts').insert({ email: 'unknown', ip_address: clientIp, success: false, attempt_type: 'set_password', correlation_id: correlationId });
      return new Response(JSON.stringify({ error: "Invalid or expired token. Please start over." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = resetToken.user_id;
    const newPasswordHash = await hashValue(new_password);

    // Check password history
    const { data: history } = await supabaseAdmin.from('password_history')
      .select('password_hash').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);

    if (history && history.length > 0) {
      for (const record of history) {
        if (await verifyValue(new_password, record.password_hash)) {
          await supabaseAdmin.from('password_reset_attempts').insert({ email: resetToken.email, ip_address: clientIp, success: false, attempt_type: 'set_password', correlation_id: correlationId });
          await checkAndRaiseAlert(supabaseAdmin, resetToken.email, clientIp, correlationId);
          return new Response(JSON.stringify({ reused: true, error: "Cannot reuse recent passwords" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: new_password });
    if (updateError) {
      if (updateError.code === 'weak_password' || updateError.name === 'AuthWeakPasswordError') {
        const reasons = (updateError as any).reasons || [];
        return new Response(JSON.stringify({
          weak_password: true, reasons,
          error: reasons.includes('pwned') ? "This password has appeared in a data breach and cannot be used." : "Password is too weak."
        }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw updateError;
    }

    await supabaseAdmin.from('password_history').insert({ user_id: userId, password_hash: newPasswordHash });

    try { await supabaseAdmin.auth.admin.signOut(userId, 'global'); } catch (e) { console.error('[PasswordReset] Session invalidation error:', e); }

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (user?.email) {
      await supabaseAdmin.functions.invoke('send-password-changed-email', {
        body: { email: user.email, userName: user.user_metadata?.full_name || user.email.split('@')[0], timestamp: new Date().toLocaleString(), deviceInfo: resetToken.user_agent || 'Unknown device' },
      });
    }

    await supabaseAdmin.from('password_reset_attempts').insert({ email: resetToken.email, ip_address: clientIp, success: true, attempt_type: 'set_password', correlation_id: correlationId });

    return new Response(JSON.stringify({ success: true, message: "Password changed successfully" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[PasswordReset][set_password] Error:", error);
    const h = getAuthCorsHeaders(req);
    if (error.name === 'ZodError') return new Response(JSON.stringify({ error: "Invalid request format" }), { status: 400, headers: { ...h, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ error: "An error occurred while resetting password" }), { status: 500, headers: { ...h, "Content-Type": "application/json" } });
  }
});

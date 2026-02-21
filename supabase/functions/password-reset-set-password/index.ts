import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-application-name",
};

const requestSchema = z.object({
  token: z.string(),
  new_password: z.string().min(12),
  confirm_password: z.string(),
});

// Web Crypto PBKDF2 hash — no WASM, fully supported in Edge Runtime
async function hashValue(value: string, saltHex?: string): Promise<string> {
  let saltBytes: Uint8Array;
  if (saltHex) {
    saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  } else {
    saltBytes = crypto.getRandomValues(new Uint8Array(16));
  }
  const computedSaltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${computedSaltHex}:${hashHex}`;
}

// Web Crypto PBKDF2 verify — handles legacy bcrypt gracefully
async function verifyValue(value: string, stored: string): Promise<boolean> {
  // Legacy bcrypt hashes won't contain ':' — skip gracefully (one-time migration window)
  if (!stored.includes(':')) {
    console.warn('[PasswordReset][set_password] Legacy bcrypt hash in history — skipping comparison');
    return false;
  }
  const [saltHex] = stored.split(':');
  const reHashed = await hashValue(value, saltHex);
  return reHashed === stored;
}

// Check if security alert should be raised
async function checkAndRaiseAlert(supabaseAdmin: any, email: string, clientIp: string, correlationId: string | null) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from('password_reset_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('success', false)
    .in('attempt_type', ['validate_otp', 'validate_token', 'set_password'])
    .gte('attempted_at', oneHourAgo);

  if (count && count >= 3) {
    console.log(`[PasswordReset][${correlationId}][SECURITY_ALERT] ${count} failed attempts for email in last hour`);
    await supabaseAdmin.from('security_alerts').insert({
      alert_type: 'password_reset_brute_force',
      email,
      ip_address: clientIp,
      details: { failed_attempts: count, correlation_id: correlationId, stage: 'set_password' },
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { token, new_password, confirm_password } = requestSchema.parse(body);
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    if (new_password !== confirm_password) {
      return new Response(
        JSON.stringify({ error: "Passwords do not match" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require validated_by IN ('otp', 'magic_link')
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: tokens, error: lookupError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('magic_token', token)
      .eq('is_used', true)
      .gt('used_at', fifteenMinAgo)
      .in('validated_by', ['otp', 'magic_link'])
      .limit(1);

    if (lookupError) {
      console.error('[PasswordReset][set_password] Lookup error:', lookupError);
      throw lookupError;
    }

    const resetToken = tokens?.[0];
    const correlationId = resetToken?.correlation_id || null;

    console.log(`[PasswordReset][${correlationId}][set_password] Processing password change`);

    if (!resetToken) {
      console.log(`[PasswordReset][${correlationId}][set_password] No valid validated token found`);

      await supabaseAdmin.from('password_reset_attempts').insert({
        email: 'unknown',
        ip_address: clientIp,
        success: false,
        attempt_type: 'set_password',
        correlation_id: correlationId,
      });

      return new Response(
        JSON.stringify({ error: "Invalid or expired token. Please start over." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = resetToken.user_id;

    // Hash new password using Web Crypto PBKDF2 (no WASM)
    const newPasswordHash = await hashValue(new_password);

    // Check password history (last 5 passwords)
    const { data: history } = await supabaseAdmin
      .from('password_history')
      .select('password_hash')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (history && history.length > 0) {
      for (const record of history) {
        const matches = await verifyValue(new_password, record.password_hash);
        if (matches) {
          console.log(`[PasswordReset][${correlationId}][set_password] Password reuse detected`);

          await supabaseAdmin.from('password_reset_attempts').insert({
            email: resetToken.email,
            ip_address: clientIp,
            success: false,
            attempt_type: 'set_password',
            correlation_id: correlationId,
          });

          await checkAndRaiseAlert(supabaseAdmin, resetToken.email, clientIp, correlationId);

          return new Response(
            JSON.stringify({ reused: true, error: "Cannot reuse recent passwords" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Update password in auth.users
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: new_password }
    );

    if (updateError) {
      console.error(`[PasswordReset][${correlationId}][set_password] Update error:`, updateError);

      // Handle weak/breached password specifically
      if (updateError.code === 'weak_password' || updateError.name === 'AuthWeakPasswordError') {
        const reasons = (updateError as any).reasons || [];
        return new Response(
          JSON.stringify({
            weak_password: true,
            reasons,
            error: reasons.includes('pwned')
              ? "This password has appeared in a data breach and cannot be used. Please choose a different password."
              : "Password is too weak. Please choose a stronger password."
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw updateError;
    }

    // Store new password hash in history
    await supabaseAdmin.from('password_history').insert({
      user_id: userId,
      password_hash: newPasswordHash,
    });

    // Invalidate all sessions globally
    try {
      await supabaseAdmin.auth.admin.signOut(userId, 'global');
      console.log(`[PasswordReset][${correlationId}][set_password] All sessions invalidated`);
    } catch (signOutError) {
      console.error(`[PasswordReset][${correlationId}][set_password] Session invalidation error:`, signOutError);
    }

    // Send confirmation email
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (user?.email) {
      await supabaseAdmin.functions.invoke('send-password-changed-email', {
        body: {
          email: user.email,
          userName: user.user_metadata?.full_name || user.email.split('@')[0],
          timestamp: new Date().toLocaleString(),
          deviceInfo: resetToken.user_agent || 'Unknown device',
        },
      });
    }

    // Log successful attempt
    await supabaseAdmin.from('password_reset_attempts').insert({
      email: resetToken.email,
      ip_address: clientIp,
      success: true,
      attempt_type: 'set_password',
      correlation_id: correlationId,
    });

    console.log(`[PasswordReset][${correlationId}][set_password] Password changed successfully`);

    return new Response(
      JSON.stringify({ success: true, message: "Password changed successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[PasswordReset][set_password] Error:", error);

    if (error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "An error occurred while resetting password" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

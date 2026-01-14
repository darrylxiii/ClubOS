import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

const requestSchema = z.object({
  token: z.string(),
  new_password: z.string().min(12),
  confirm_password: z.string(),
});

serve(async (req) => {
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

    if (new_password !== confirm_password) {
      return new Response(
        JSON.stringify({ error: "Passwords do not match" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Set Password] Token: ${token.substring(0, 10)}...`);

    // Validate token
    const { data: tokens, error: lookupError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('magic_token', token)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (lookupError) {
      console.error('[Set Password] Lookup error:', lookupError);
      throw lookupError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('[Set Password] Invalid token');
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resetToken = tokens[0];
    const userId = resetToken.user_id;

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password);

    // Check password history (last 5 passwords)
    const { data: history, error: historyError } = await supabaseAdmin
      .from('password_history')
      .select('password_hash')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (historyError) {
      console.error('[Set Password] History lookup error:', historyError);
      throw historyError;
    }

    // Check if new password matches any recent password
    if (history && history.length > 0) {
      for (const record of history) {
        const matches = await bcrypt.compare(new_password, record.password_hash);
        if (matches) {
          console.log('[Set Password] Password reuse detected');
          return new Response(
            JSON.stringify({
              reused: true,
              error: "Cannot reuse recent passwords"
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
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
      console.error('[Set Password] Update password error:', updateError);
      throw updateError;
    }

    // Store password in history
    await supabaseAdmin
      .from('password_history')
      .insert({
        user_id: userId,
        password_hash: newPasswordHash,
      });

    // Mark token as used
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', resetToken.id);

    // Get user email for confirmation
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (user?.email) {
      // Send confirmation email
      await supabaseAdmin.functions.invoke('send-password-changed-email', {
        body: {
          email: user.email,
          userName: user.user_metadata?.full_name || user.email.split('@')[0],
          timestamp: new Date().toLocaleString(),
          deviceInfo: resetToken.user_agent || 'Unknown device'
        }
      });
    }

    console.log(`[Set Password] Success for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password changed successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Set Password] Error:", error);
    
    if (error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "An error occurred while resetting password" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

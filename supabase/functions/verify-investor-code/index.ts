import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hashCode(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code.trim().toLowerCase());
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return new Response(JSON.stringify({ valid: false, error: "Missing access code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const codeHash = await hashCode(code);

    const { data, error } = await supabase
      .from("investor_access_codes")
      .select("id, label, expires_at")
      .eq("code_hash", codeHash)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      // Log failed attempt
      console.log(`[InvestorPortal] Invalid access attempt at ${new Date().toISOString()}`);
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update last_used_at
    await supabase
      .from("investor_access_codes")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);

    return new Response(
      JSON.stringify({
        valid: true,
        label: data.label,
        expires_at: data.expires_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[InvestorPortal] Verification error:", err);
    return new Response(JSON.stringify({ valid: false, error: "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

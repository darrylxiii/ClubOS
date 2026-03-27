import { createHandler } from '../_shared/handler.ts';

async function hashCode(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code.trim().toLowerCase());
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(createHandler(async (req, ctx) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { code } = await req.json();

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return new Response(JSON.stringify({ valid: false, error: "Missing access code" }), {
      status: 400,
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
    });
  }

  const codeHash = await hashCode(code);

  const { data, error } = await ctx.supabase
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
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update last_used_at
  await ctx.supabase
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
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
    }
  );
}));

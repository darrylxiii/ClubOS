import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
    const corsHeaders = ctx.corsHeaders;
    const supabase = ctx.supabase;

    // Call the database function that handles timeouts
    const { data, error } = await supabase.rpc("timeout_expired_avatar_sessions");

    if (error) {
      console.error("Timeout function error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Timed out ${data} sessions`);

    return new Response(JSON.stringify({ timed_out: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}));

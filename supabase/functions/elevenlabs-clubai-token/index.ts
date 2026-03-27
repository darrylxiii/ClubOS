import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createHandler } from '../_shared/handler.ts';
import { resilientFetch } from '../_shared/resilient-fetch.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID');

  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }
  if (!ELEVENLABS_AGENT_ID) {
    throw new Error('ELEVENLABS_AGENT_ID is not set');
  }

  let userName = 'there';
  let userRole = 'member';

  if (ctx.user) {
    // Fetch user profile for personalization
    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', ctx.user.id)
      .single();

    if (profile) {
      userName = profile.full_name?.split(' ')[0] || 'there';
      userRole = profile.role || 'member';
    }
  }

  // Parse request body for context
  const { context = {} } = await req.json().catch(() => ({}));
  const currentPage = context.page || 'dashboard';

  console.log("Creating ClubAI voice session for user:", ctx.user?.id, "on page:", currentPage);

  // Request a signed URL from ElevenLabs using the configured Agent ID
  const { response } = await resilientFetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
    {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    },
    {
      timeoutMs: 10_000,
      maxRetries: 1,
      service: 'elevenlabs',
      operation: 'get-signed-url',
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs API error:", response.status, errorText);
    throw new Error(`Failed to create voice session: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("ClubAI session created successfully");

  // Log session creation
  if (ctx.user) {
    await ctx.supabase.from('clubai_voice_sessions').insert({
      user_id: ctx.user.id,
      context: { page: currentPage, userName, userRole },
    });
  }

  return new Response(JSON.stringify({
    signedUrl: data.signed_url,
    userName,
    userRole,
    currentPage,
  }), {
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
  });
}));

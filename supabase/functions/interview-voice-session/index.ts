import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createHandler } from '../_shared/handler.ts';
import { resilientFetch } from '../_shared/resilient-fetch.ts';

Deno.serve(createHandler(async (req, ctx) => {
    const { corsHeaders } = ctx;
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }

    const { jobData, agentId } = await req.json();
    
    console.log("Creating interview session for:", jobData);
    
    // If an agent ID is provided, use it. Otherwise, return error
    if (!agentId) {
      throw new Error("Agent ID is required. Please create an agent in ElevenLabs dashboard first.");
    }

    // Request a signed URL from ElevenLabs with the agent ID
    const { response } = await resilientFetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
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
      console.error("ElevenLabs API error:", errorText);
      throw new Error(`Failed to create session: ${response.status}`);
    }

    const data = await response.json();
    console.log("Session created successfully:", data);

    return new Response(JSON.stringify({
      signedUrl: data.signed_url
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}));

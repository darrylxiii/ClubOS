import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const TokenSchema = z.object({
    jobData: z.any().optional(),
    agentId: z.string().optional(),
});

interface ActionContext {
    payload: any;
}

export async function handleInterviewVoiceSession({ payload }: ActionContext) {
    const { agentId } = TokenSchema.parse(payload);

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is not set');
    if (!agentId) throw new Error("Agent ID is required");

    // Request signed URL
    const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
        {
            method: "GET",
            headers: { "xi-api-key": ELEVENLABS_API_KEY },
        }
    );

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`ElevenLabs API error: ${txt}`);
    }

    const data = await response.json();
    return { signedUrl: data.signed_url };
}

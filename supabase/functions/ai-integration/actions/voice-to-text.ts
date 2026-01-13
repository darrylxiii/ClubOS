import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const VoiceToTextSchema = z.object({
    audio: z.string(),
    meetingId: z.string().optional(),
    participantName: z.string().optional(),
    timestamp: z.string().optional(),
});

interface ActionContext {
    payload: any;
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function handleVoiceToText({ payload }: ActionContext) {
    const { audio, meetingId, participantName, timestamp } = VoiceToTextSchema.parse(payload);

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    console.log('[Voice-to-Text] Processing audio...', { meetingId, length: audio.length });

    const audioData = base64ToUint8Array(audio);
    const formData = new FormData();
    const blob = new Blob([audioData.buffer], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Whisper error: ${errorText}`);
    }

    const result = await response.json();

    return {
        text: result.text,
        meetingId,
        participantName,
        timestamp: timestamp || new Date().toISOString()
    };
}

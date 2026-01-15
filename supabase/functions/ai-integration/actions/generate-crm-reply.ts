import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const GenerateCRMReplySchema = z.object({
    prospectName: z.string(),
    prospectCompany: z.string().optional(),
    originalEmail: z.string(),
    classification: z.string(),
    tone: z.string().optional(),
});

interface ActionContext {
    payload: any;
}

export async function handleGenerateCRMReply({ payload }: ActionContext) {
    const { prospectName, prospectCompany, originalEmail, classification, tone = 'professional' } = GenerateCRMReplySchema.parse(payload);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
    }

    const classificationContext: Record<string, string> = {
        hot: 'The prospect is very interested and ready to move forward. Be enthusiastic and propose next steps.',
        warm: 'The prospect shows interest but may have questions. Be helpful and address any concerns.',
        objection: 'The prospect has raised an objection. Acknowledge their concern and provide a thoughtful response.',
        not_interested: 'The prospect is not interested. Be gracious and leave the door open for future contact.',
        neutral: 'The prospect response is neutral. Be friendly and try to re-engage with value.'
    };

    const systemPrompt = `You are a professional sales representative for The Quantum Club, an elite recruitment platform. 
Generate a concise, professional email reply based on the prospect's response.

Guidelines:
- Keep replies under 150 words
- Be ${tone} in tone
- ${classificationContext[classification] || classificationContext.neutral}
- Include a clear call-to-action
- Personalize using the prospect's name and company
- Never be pushy or aggressive
- End with a professional sign-off`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: `Prospect: ${prospectName} from ${prospectCompany || 'Unknown Company'}
Classification: ${classification}
Their email:
${originalEmail}

Generate a professional reply:`
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        throw new Error('Failed to generate reply');
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return { reply, classification };
}

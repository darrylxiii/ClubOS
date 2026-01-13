import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const GeneratePostSuggestionsSchema = z.object({
    context: z.string().optional(),
    postType: z.string().optional(),
    platform: z.string().optional(),
    currentContent: z.string().optional(),
});

interface ActionContext {
    payload: any;
}

export async function handleGeneratePostSuggestions({ payload }: ActionContext) {
    const { context, postType, platform, currentContent } = GeneratePostSuggestionsSchema.parse(payload);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    let suggestions: string[] = [];

    if (LOVABLE_API_KEY) {
        const systemPrompt = `You are an expert social media content strategist for The Quantum Club, a luxury talent platform. Generate engaging, professional post suggestions that:
- Match the platform's tone (LinkedIn = professional, Twitter = concise, Instagram = visual-focused)
- Drive engagement and showcase thought leadership
- Use a calm, discreet, competent tone without exclamation points
- Are relevant to career development, hiring, and professional growth`;

        const userPrompt = `Generate 3 unique post suggestions for ${platform || 'LinkedIn'}.
Post type: ${postType || 'standard'}
${currentContent ? `Current draft: "${currentContent}"` : 'No current content.'}
${context ? `Additional context: ${context}` : ''}

Return ONLY a JSON array of 3 strings, each being a complete post. No markdown, no explanation.`;

        try {
            const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 1000,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;
                try {
                    const jsonMatch = content.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        suggestions = JSON.parse(jsonMatch[0]);
                    } else {
                        suggestions = JSON.parse(content);
                    }
                } catch {
                    suggestions = content.split('\n\n').filter((s: string) => s.trim().length > 20).slice(0, 3);
                }
            } else {
                console.error('Lovable AI error:', response.status);
            }
        } catch (aiError) {
            console.error('AI suggestion error:', aiError);
        }
    }

    if (suggestions.length === 0) {
        suggestions = [
            "What's one career lesson you wish you'd learned earlier? For me, it's the power of strategic patience—knowing when to push and when to wait has been transformative.",
            "The best opportunities often come from unexpected connections. That coffee chat you're considering? It might lead somewhere extraordinary.",
            "Three things I look for in every role: growth potential, cultural alignment, and impact opportunity. What's on your non-negotiable list?",
        ];
    }

    return { suggestions };
}

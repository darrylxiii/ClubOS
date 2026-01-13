import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { fetchAI, handleAIError } from "../../_shared/ai-fetch.ts";

const OperationSchema = z.enum(['improve', 'summarize', 'expand', 'translate', 'generate', 'simplify', 'professional', 'casual']);

const TextGenSchema = z.object({
    operation: OperationSchema,
    text: z.string(),
    context: z.string().optional(),
    targetLanguage: z.string().optional(),
    customPrompt: z.string().optional(),
});

interface ActionContext {
    payload: any;
}

const getSystemPrompt = (operation: string, targetLanguage?: string): string => {
    const prompts: Record<string, string> = {
        improve: `You are QUIN, an AI writing assistant... Improve text... Return ONLY improved text.`,
        summarize: `Summarize concisely... Return ONLY the summary.`,
        expand: `Expand with detail... Return ONLY expanded text.`,
        translate: `Translate to ${targetLanguage || 'English'}... Return ONLY translation.`,
        generate: `Generate content... Return ONLY generated content.`,
        simplify: `Simplify text... Return ONLY simplified text.`,
        professional: `Make professional... Return ONLY rewritten text.`,
        casual: `Make casual... Return ONLY rewritten text.`,
    };
    return prompts[operation] || prompts.improve;
};

export async function handleAiWriting({ payload }: ActionContext) {
    const { operation, text, context, targetLanguage, customPrompt } = TextGenSchema.parse(payload);

    const systemPrompt = getSystemPrompt(operation, targetLanguage);

    let userPrompt = text;
    if (operation === 'generate' && customPrompt) userPrompt = customPrompt;
    if (context) userPrompt = `Context: ${context}\n\nText: ${text}`;

    const response = await fetchAI({
        model: 'google/gemini-2.5-flash',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
    }, { timeoutMs: 30000 });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI service error: ${errorText}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) throw new Error('No content generated');

    return {
        result,
        operation,
        originalLength: text.length,
        resultLength: result.length,
    };
}

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const AssistSchema = z.object({
    action: z.string(),
    currentText: z.string(),
    subject: z.string().optional(),
    recipientEmail: z.string().optional(),
});

interface ActionContext {
    payload: any;
}

export async function handleAssistEmailWriting({ payload }: ActionContext) {
    const { action, currentText, subject, recipientEmail } = AssistSchema.parse(payload);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
        throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = "You are an AI writing assistant for The Quantum Club's executive email system. Help craft professional, clear, and effective emails.";
    let userPrompt = "";

    switch (action) {
        case "compose":
            userPrompt = `Compose a professional email with:\nSubject: ${subject || "No subject"}\nTo: ${recipientEmail || "recipient"}\n\nWrite a complete, professional email body.`;
            break;
        case "improve":
            userPrompt = `Improve this email text while maintaining its core message and tone:\n\n${currentText}\n\nMake it clearer, more professional, and better structured.`;
            break;
        case "shorten":
            userPrompt = `Make this email more concise:\n\n${currentText}`;
            break;
        case "expand":
            userPrompt = `Expand this email with more detail and context:\n\n${currentText}`;
            break;
        case "professional":
            userPrompt = `Rewrite this email in a more formal, professional tone:\n\n${currentText}`;
            break;
        case "friendly":
            userPrompt = `Rewrite this email in a warmer, more approachable tone:\n\n${currentText}`;
            break;
        default:
            throw new Error("Invalid action");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 500,
        }),
    });

    if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`AI API Error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const suggestion = aiData.choices?.[0]?.message?.content || "";

    return { suggestion };
}

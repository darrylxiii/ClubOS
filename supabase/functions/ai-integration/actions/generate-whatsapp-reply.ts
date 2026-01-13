import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const GenerateWhatsAppReplySchema = z.object({
    conversationId: z.string(),
    tone: z.string().optional(),
});

interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateWhatsAppReply({ supabase, payload }: ActionContext) {
    const { conversationId, tone = "professional" } = GenerateWhatsAppReplySchema.parse(payload);

    // Fetch conversation context
    const { data: conversation, error: convError } = await supabase
        .from("whatsapp_conversations")
        .select("*, candidate_profiles(*)")
        .eq("id", conversationId)
        .single();

    if (convError) throw new Error(`Failed to fetch conversation: ${convError.message}`);

    // Fetch recent messages
    const { data: messages, error: messagesError } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(10);

    if (messagesError) throw new Error(`Failed to fetch messages: ${messagesError.message}`);

    let candidateContext = "";
    if (conversation.candidate_id) {
        const { data: candidate } = await supabase
            .from("candidate_profiles")
            .select("full_name, current_title, skills, desired_roles")
            .eq("id", conversation.candidate_id)
            .single();

        if (candidate) {
            candidateContext = `
Candidate: ${candidate.full_name}
Current Role: ${candidate.current_title || "Not specified"}
Skills: ${Array.isArray(candidate.skills) ? candidate.skills.slice(0, 5).join(", ") : "Not specified"}
Looking for: ${Array.isArray(candidate.desired_roles) ? candidate.desired_roles.join(", ") : "Not specified"}`;
        }
    }

    const conversationHistory = messages
        ?.reverse()
        .map((m: any) => `${m.direction === "inbound" ? "Candidate" : "TQC"}: ${m.content}`)
        .join("\n") || "";

    const lastMessage = messages?.[0];
    const intent = lastMessage?.intent_classification || "general";
    const sentiment = lastMessage?.sentiment_score || 0;

    let replies: { text: string; tone: string; confidence: number }[] = [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (LOVABLE_API_KEY) {
        try {
            const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "google/gemini-2.5-flash", // Using Lovable gateway model
                    messages: [
                        {
                            role: "system",
                            content: `You are a recruiting assistant for The Quantum Club, an elite talent platform. Generate 3 smart reply suggestions for WhatsApp messages. 

Context:
${candidateContext}

Guidelines:
- Keep replies concise (under 160 characters for WhatsApp)
- Match the ${tone} tone
- Be helpful and professional
- If scheduling, suggest specific actions
- If questions, provide clear answers or next steps

Respond in JSON format:
{
  "replies": [
    { "text": "Reply 1", "tone": "professional", "confidence": 0.95 },
    { "text": "Reply 2", "tone": "friendly", "confidence": 0.85 },
    { "text": "Reply 3", "tone": "brief", "confidence": 0.75 }
  ]
}`
                        },
                        {
                            role: "user",
                            content: `Conversation history:
${conversationHistory}

Last message intent: ${intent}
Sentiment score: ${sentiment}

Generate 3 appropriate reply suggestions.`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500,
                }),
            });

            if (response.ok) {
                const aiResult = await response.json();
                if (aiResult.choices?.[0]?.message?.content) {
                    try {
                        const parsed = JSON.parse(aiResult.choices[0].message.content);
                        replies = parsed.replies || [];
                    } catch {
                        // Fallback will buffer
                    }
                }
            }
        } catch (e) {
            console.error("AI WhatsApp Reply Error", e);
        }
    }

    if (replies.length === 0) {
        replies = generateFallbackReplies(intent, sentiment, conversation.candidate_name);
    }

    return {
        success: true,
        replies,
        context: {
            intent,
            sentiment,
            candidateName: conversation.candidate_name,
        },
    };
}

function generateFallbackReplies(
    intent: string,
    sentiment: number,
    candidateName: string | null
): { text: string; tone: string; confidence: number }[] {
    const name = candidateName?.split(" ")[0] || "there";

    switch (intent) {
        case "interested":
            return [
                { text: `Great to hear you're interested, ${name}! When would be a good time for a quick call?`, tone: "friendly", confidence: 0.9 },
                { text: `Excellent! I'll send over some role details. What's the best email to reach you?`, tone: "professional", confidence: 0.85 },
                { text: `Perfect! Let me check availability with the hiring team and get back to you shortly.`, tone: "professional", confidence: 0.8 },
            ];
        case "question":
            return [
                { text: `Great question! Let me find that information for you.`, tone: "helpful", confidence: 0.85 },
                { text: `I'll look into that and get back to you shortly.`, tone: "professional", confidence: 0.8 },
                { text: `Happy to clarify! Could you tell me more about what you'd like to know?`, tone: "friendly", confidence: 0.75 },
            ];
        case "reschedule":
            return [
                { text: `No problem! What times work better for you?`, tone: "accommodating", confidence: 0.9 },
                { text: `Of course, things happen. Let me know your preferred alternatives.`, tone: "understanding", confidence: 0.85 },
                { text: `Sure thing! I'll send you some new time slots to choose from.`, tone: "helpful", confidence: 0.8 },
            ];
        case "negative":
            return [
                { text: `I understand, ${name}. Thanks for letting me know. Is there anything I can help clarify?`, tone: "professional", confidence: 0.85 },
                { text: `No worries at all. Feel free to reach out if anything changes!`, tone: "friendly", confidence: 0.8 },
                { text: `Thanks for your honesty. We'll keep you in mind for future opportunities that might be a better fit.`, tone: "professional", confidence: 0.75 },
            ];
        default:
            return [
                { text: `Thanks for your message, ${name}! How can I help you today?`, tone: "friendly", confidence: 0.8 },
                { text: `Got it! Is there anything specific you'd like to discuss?`, tone: "professional", confidence: 0.75 },
                { text: `Thanks for reaching out! Let me know how I can assist.`, tone: "helpful", confidence: 0.7 },
            ];
    }
}

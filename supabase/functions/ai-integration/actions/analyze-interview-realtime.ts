import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkUserRateLimit } from "../../_shared/rate-limiter.ts";

const RealtimeAnalysisSchema = z.object({
    meetingId: z.string().uuid(),
    transcript: z.string().min(1).max(50000),
});

const ScoreSchema = z.object({
    communication_clarity: z.number().min(0).max(100),
    technical_depth: z.number().min(0).max(100),
    culture_fit: z.number().min(0).max(100),
    red_flags: z.array(z.string()).optional(),
    green_flags: z.array(z.string()).optional(),
    overall_score: z.number().min(0).max(100),
    key_insights: z.string(),
    follow_up_suggestions: z.array(z.string()).optional()
});

interface ActionContext {
    supabase: any;
    payload: any;
    user: any;
}

export async function handleAnalyzeInterviewRealtime({ supabase, payload, user }: ActionContext) {
    const { meetingId, transcript } = RealtimeAnalysisSchema.parse(payload);

    if (!user) throw new Error("Unauthorized");

    // Rate Limit
    const rateLimit = await checkUserRateLimit(user.id, 'analyze-interview-realtime', 5, 900000); // 5 per 15 min
    if (!rateLimit.allowed) throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter}s`);

    // Verify Participation
    const { data: participant, error: pErr } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .single();

    if (pErr || !participant) throw new Error("Forbidden: Not a participant");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log(`[Realtime Analysis] Meeting: ${meetingId}`);

    // Call AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
                { role: "system", content: "You are an AI interview analyst. Analyze in real-time. Return JSON with scores." },
                { role: "user", content: `Analyze transcript:\n\n${transcript}` }
            ],
            tools: [{
                type: "function",
                function: {
                    name: "score_interview",
                    description: "Score the interview",
                    parameters: {
                        type: "object",
                        properties: {
                            communication_clarity: { type: "number" },
                            technical_depth: { type: "number" },
                            culture_fit: { type: "number" },
                            red_flags: { type: "array", items: { type: "string" } },
                            green_flags: { type: "array", items: { type: "string" } },
                            overall_score: { type: "number" },
                            key_insights: { type: "string" },
                            follow_up_suggestions: { type: "array", items: { type: "string" } }
                        },
                        required: ["communication_clarity", "technical_depth", "culture_fit", "overall_score", "key_insights"]
                    }
                }
            }],
            tool_choice: { type: "function", function: { name: "score_interview" } }
        }),
    });

    if (!response.ok) throw new Error(`AI API Error: ${response.status}`);
    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    let scores;
    try {
        scores = ScoreSchema.parse(JSON.parse(toolCall.function.arguments));
    } catch (e) {
        throw new Error("Invalid AI scoring format");
    }

    // Update DB
    const { data: existing } = await supabase.from('interview_insights').select('id').eq('meeting_id', meetingId).single();

    const updatePayload = {
        communication_clarity: scores.communication_clarity,
        technical_depth: scores.technical_depth,
        culture_fit: scores.culture_fit,
        red_flags: scores.red_flags || [],
        green_flags: scores.green_flags || [],
        overall_score: scores.overall_score,
        key_insights: scores.key_insights,
        follow_up_suggestions: scores.follow_up_suggestions || [],
        last_analyzed_at: new Date().toISOString(),
    };

    if (existing) {
        await supabase.from('interview_insights').update(updatePayload).eq('id', existing.id);
    } else {
        await supabase.from('interview_insights').insert({ ...updatePayload, meeting_id: meetingId });
    }

    return { success: true, scores };
}

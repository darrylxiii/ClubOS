import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const QuinSchema = z.object({
    command: z.string(),
    meetingId: z.string().optional(),
    context: z.any().optional(),
});

interface ActionContext {
    supabase: any;
    payload: any;
    user: any;
}

export async function handleQuinMeetingVoice({ supabase, payload, user }: ActionContext) {
    const { command, meetingId, context = {} } = QuinSchema.parse(payload);

    if (!user) throw new Error("Unauthorized");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Meeting Context
    let meetingContext = "";
    if (meetingId) {
        const { data: meeting } = await supabase.from("meetings").select("title, meeting_type").eq("id", meetingId).single();
        if (meeting) meetingContext = `Meeting: ${meeting.title}, Type: ${meeting.meeting_type}`;
        if (context.recentTranscript) meetingContext += `\n\nRecent discussion:\n${context.recentTranscript}`;
    }

    const commandLower = command.toLowerCase();
    let responseType = "general";
    let responseText = "";

    // Logic Branching
    if (commandLower.includes("summarize") || commandLower.includes("summary")) {
        responseType = "summary";
        responseText = await callAI(LOVABLE_API_KEY, "You are QUIN. Summarize meeting discussion under 100 words.", `${meetingContext}\n\nSummarize last 5 minutes.`);
    } else if (commandLower.includes("question") || commandLower.includes("ask")) {
        responseType = "suggestion";
        responseText = await callAI(LOVABLE_API_KEY, "You are QUIN. Suggest 2-3 follow-up questions.", `${meetingContext}\n\nWhat questions should I ask next?`);
    } else if (commandLower.includes("flag") || commandLower.includes("mark")) {
        responseType = "flag";
        if (meetingId) {
            await supabase.from("meeting_insights").insert({
                meeting_id: meetingId,
                insight_type: "user_flagged",
                title: "Flagged by host",
                content: context.recentTranscript?.slice(-500) || "Flagged moment",
                priority: "high",
                is_important: true
            });
        }
        responseText = "Moment flagged.";
    } else if (commandLower.includes("time")) {
        responseType = "info";
        responseText = context.remainingTime ? `${context.remainingTime} minutes remaining.` : "Schedule info unavailable.";
    } else {
        responseText = await callAI(LOVABLE_API_KEY, "You are QUIN. Respond briefly under 75 words.", `${meetingContext}\n\nUser said: ${command}`);
    }

    // Log
    await supabase.from("ai_action_log").insert({
        user_id: user.id,
        action_type: "quin_voice_command",
        action_data: { command, meetingId, responseType },
        result: { responseText: responseText.slice(0, 500) },
        status: "completed"
    });

    return { success: true, responseType, responseText, timestamp: new Date().toISOString() };
}

async function callAI(apiKey: string | undefined, system: string, user: string) {
    if (!apiKey) return "AI Configuration Check Required.";
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "system", content: system }, { role: "user", content: user }],
            max_tokens: 200
        })
    });
    if (!resp.ok) return "I encountered an error connecting to my brain.";
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || "No response generated.";
}

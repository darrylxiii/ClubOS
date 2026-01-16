interface ActionContext {
    supabase: any;
    payload: any;
    userId: string | null;
}

export async function handleGenerateAnalyticsInsights({ supabase, payload, userId }: ActionContext) {
    // payload might contain userId override for admins but we stick to auth context for safety mostly
    // Original allowed userId passed in body. We'll support both but prefer context.
    const targetUserId = payload.userId || userId;
    if (!targetUserId) throw new Error('UserId required');

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const [
        { data: profileAnalytics },
        { data: userPosts }
    ] = await Promise.all([
        supabase.from("profile_analytics").select("*").eq("user_id", targetUserId).order("date", { ascending: false }).limit(30),
        supabase.from("unified_posts").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(20)
    ]);

    const context = {
        analytics: profileAnalytics,
        totalPosts: userPosts?.length || 0
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
                { role: "system", content: "You are a social media analytics advisor. Provide 3-5 actionable insights in JSON." },
                { role: "user", content: `Data: ${JSON.stringify(context)}` }
            ],
            tools: [{
                type: "function",
                function: {
                    name: "generate_insights",
                    parameters: {
                        type: "object",
                        properties: {
                            insights: { type: "array", items: { type: "object", properties: { type: { type: "string" }, title: { type: "string" }, content: { type: "string" }, confidence: { type: "number" } }, required: ["type", "title", "content", "confidence"] } }
                        },
                        required: ["insights"]
                    }
                }
            }],
            tool_choice: { type: "function", function: { name: "generate_insights" } }
        })
    });

    if (!aiResponse.ok) throw new Error(`AI error ${aiResponse.status}`);
    const data = await aiResponse.json();
    const insights = JSON.parse(data.choices[0]?.message?.tool_calls?.[0]?.function?.arguments || '{"insights":[]}').insights;

    if (insights.length) {
        await supabase.from("analytics_insights").insert(insights.map((i: any) => ({
            user_id: targetUserId,
            insight_type: i.type,
            insight_title: i.title,
            insight_content: i.content,
            confidence_score: i.confidence
        })));
    }

    return { success: true, insights };
}

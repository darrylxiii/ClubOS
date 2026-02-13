import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agent_name, message, conversation_id } = await req.json();
    if (!agent_name || !message) {
      return new Response(JSON.stringify({ error: "agent_name and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load agent from registry
    const { data: agent } = await supabase
      .from("agent_registry")
      .select("*")
      .eq("agent_name", agent_name)
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load context in parallel
    const [
      { data: recentDecisions },
      { data: feedback },
      { data: instructions },
      { data: existingConversation },
    ] = await Promise.all([
      supabase
        .from("agent_decision_log")
        .select("decision_type, decision_made, confidence_score, created_at, was_overridden")
        .eq("agent_name", agent_name)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("agent_feedback")
        .select("rating, comment, created_at")
        .eq("agent_name", agent_name)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("agent_instructions")
        .select("instruction, priority")
        .eq("agent_name", agent_name)
        .eq("is_active", true)
        .order("priority", { ascending: false }),
      conversation_id
        ? supabase
            .from("agent_conversations")
            .select("*")
            .eq("id", conversation_id)
            .single()
        : supabase
            .from("agent_conversations")
            .select("*")
            .eq("agent_name", agent_name)
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    // Build system prompt with full context
    const systemParts: string[] = [
      `You are ${agent.display_name}, an autonomous AI agent in The Quantum Club platform.`,
      agent.system_prompt || agent.description || "",
      `\nYour capabilities: ${agent.capabilities?.join(", ") || "general"}`,
      `Autonomy level: ${agent.autonomy_level || "suggest"}`,
    ];

    if (instructions && instructions.length > 0) {
      systemParts.push(
        "\n## Standing Instructions from Admin",
        ...instructions.map((i: any) => `- ${i.instruction}`)
      );
    }

    if (recentDecisions && recentDecisions.length > 0) {
      systemParts.push(
        "\n## Your Recent Decisions",
        ...recentDecisions.map(
          (d: any) =>
            `- [${d.decision_type}] ${d.decision_made} (confidence: ${Math.round((d.confidence_score || 0) * 100)}%${d.was_overridden ? ", OVERRIDDEN" : ""})`
        )
      );
    }

    if (feedback && feedback.length > 0) {
      systemParts.push(
        "\n## Admin Feedback on Your Decisions",
        ...feedback.map(
          (f: any) =>
            `- ${f.rating.toUpperCase()}: ${f.comment || "No comment"}`
        )
      );
    }

    systemParts.push(
      "\n## Guidelines",
      "- Be concise and actionable. You are speaking to a platform admin.",
      "- Reference your recent decisions and feedback when relevant.",
      "- If asked to do something outside your capabilities, say so clearly.",
      "- Never fabricate data or credentials.",
      "- Explain your reasoning and suggest next actions.",
      "- Powered by QUIN."
    );

    // Build conversation history
    const previousMessages = existingConversation?.messages || [];
    const conversationMessages = [
      ...previousMessages.slice(-20), // Keep last 20 messages for context
      { role: "user", content: message },
    ];

    // Call Lovable AI
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
        "x-supabase-project-ref": supabaseUrl.split("//")[1]?.split(".")[0] || "",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemParts.join("\n") },
          ...conversationMessages,
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[agent-chat] AI call failed:", errText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable", details: errText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || "I could not generate a response.";

    // Save conversation
    const updatedMessages = [
      ...conversationMessages,
      { role: "assistant", content: assistantMessage },
    ];

    let savedConversationId = existingConversation?.id;

    if (savedConversationId) {
      await supabase
        .from("agent_conversations")
        .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
        .eq("id", savedConversationId);
    } else {
      const { data: newConvo } = await supabase
        .from("agent_conversations")
        .insert({
          agent_name,
          user_id: user.id,
          messages: updatedMessages,
        })
        .select("id")
        .single();
      savedConversationId = newConvo?.id;
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        conversation_id: savedConversationId,
        agent: {
          name: agent.agent_name,
          display_name: agent.display_name,
          autonomy_level: agent.autonomy_level,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[agent-chat] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

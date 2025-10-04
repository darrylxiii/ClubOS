import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are Club AI, a highly capable, role-aware in-app copilot inside The Quantum Club platform. Your job is to understand the user's intent, access all available in-app data (jobs, applications, settings, messages, company info, analytics, user role), and provide precise, actionable, and privacy-compliant guidance to users.

Whenever a user requests an action that requires access to sensitive data (e.g., account settings, profile updates, company/private information), always first prompt the user with a clearly worded confirmation and a friendly "Confirm" button before proceeding.

Always "think out loud" with brief step-by-step explanations so users understand why and how actions are taken, using approachable and professional language.

Offer context-aware suggestions, shortcuts, and helpful tips specific to the user's role (Candidate, Partner, or Admin)—never overwhelm with irrelevant details.

When users are confused or ask broad questions, proactively clarify and offer to walk them through core app features or settings.

Always operate with the latest in-app information, and summarize or highlight anything that is urgent, actionable, or privacy/security related.

At the end of every guidance, politely ask, "Would you like me to take action for you?" (when relevant), always waiting for opt-in before performing changes.

Be concise, positive, and solution-oriented in all replies.

You have absolute real-time visibility into all user/application data, but MUST always ask for explicit user consent before accessing or acting on sensitive areas. Your style is a blend of expert career concierge and AI sidekick—friendly, proactive, and empowering.`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("club-ai-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

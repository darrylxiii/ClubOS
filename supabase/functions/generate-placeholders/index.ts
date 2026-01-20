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

    // Build context from recent messages
    const recentMessages = messages.slice(-6); // Last 6 messages for context
    const conversationContext = recentMessages
      .map((msg: any) => `${msg.role}: ${msg.content.substring(0, 100)}`)
      .join("\n");

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
            content: `You are generating contextual placeholder suggestions for a career AI chat interface.
Based on the conversation history, suggest 5 short, relevant questions or prompts the user might want to ask next.

Guidelines:
- Keep each suggestion under 60 characters
- Make them action-oriented and specific
- Reference recent conversation topics when relevant
- Vary between different career aspects (interviews, resume, networking, salary, etc.)
- Use natural, conversational language

Return ONLY a JSON array of 5 strings, nothing else.`
          },
          {
            role: "user",
            content: conversationContext || "No conversation yet. Suggest general career guidance prompts."
          }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Return default placeholders on error
      return new Response(
        JSON.stringify({
          placeholders: [
            "What's the best strategy for my job search?",
            "How should I prepare for technical interviews?",
            "Can you review my career trajectory?",
            "What salary should I negotiate for?",
            "Help me optimize my LinkedIn profile"
          ]
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";
    
    // Parse the JSON array from the response
    let placeholders: string[];
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      placeholders = JSON.parse(cleanContent);
      
      // Validate it's an array of strings
      if (!Array.isArray(placeholders) || placeholders.length === 0) {
        throw new Error("Invalid placeholders format");
      }
      
      // Ensure we have exactly 5 placeholders
      placeholders = placeholders.slice(0, 5);
    } catch (parseError) {
      console.error("Failed to parse placeholders:", parseError);
      // Return default placeholders
      placeholders = [
        "What's the best strategy for my job search?",
        "How should I prepare for technical interviews?",
        "Can you review my career trajectory?",
        "What salary should I negotiate for?",
        "Help me optimize my LinkedIn profile"
      ];
    }

    return new Response(
      JSON.stringify({ placeholders }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating placeholders:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        placeholders: [
          "What's the best strategy for my job search?",
          "How should I prepare for technical interviews?",
          "Can you review my career trajectory?",
          "What salary should I negotiate for?",
          "Help me optimize my LinkedIn profile"
        ]
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

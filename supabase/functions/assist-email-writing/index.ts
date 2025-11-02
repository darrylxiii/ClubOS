import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssistRequest {
  action: string;
  currentText: string;
  subject?: string;
  recipientEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, currentText, subject, recipientEmail }: AssistRequest = await req.json();

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build action-specific prompts
    let systemPrompt = `You are an AI writing assistant for The Quantum Club's executive email system. Help craft professional, clear, and effective emails.`;
    let userPrompt = "";

    switch (action) {
      case "compose":
        userPrompt = `Compose a professional email with:
Subject: ${subject || "No subject provided"}
To: ${recipientEmail || "recipient"}

Write a complete, professional email body that is concise and clear. Use proper email etiquette.`;
        break;

      case "improve":
        userPrompt = `Improve this email text while maintaining its core message and tone:

${currentText}

Make it clearer, more professional, and better structured. Keep the same length.`;
        break;

      case "shorten":
        userPrompt = `Make this email more concise while keeping all key information:

${currentText}

Remove unnecessary words and phrases. Be direct and clear.`;
        break;

      case "expand":
        userPrompt = `Expand this email with more detail and context:

${currentText}

Add relevant details, context, and proper elaboration while maintaining professionalism.`;
        break;

      case "professional":
        userPrompt = `Rewrite this email in a more formal, professional tone:

${currentText}

Use executive-level language, proper business etiquette, and formal structure.`;
        break;

      case "friendly":
        userPrompt = `Rewrite this email in a warmer, more approachable tone while staying professional:

${currentText}

Make it friendly and personable but maintain professionalism.`;
        break;

      default:
        throw new Error("Invalid action");
    }

    // Call Lovable AI
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
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const suggestion = aiData.choices[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in assist-email-writing:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

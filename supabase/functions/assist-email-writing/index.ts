import { createHandler } from '../_shared/handler.ts';

interface AssistRequest {
  action: string;
  currentText: string;
  subject?: string;
  recipientEmail?: string;
}

Deno.serve(createHandler(async (req, ctx) => {
    const corsHeaders = ctx.corsHeaders;
    const { action, currentText, subject, recipientEmail }: AssistRequest = await req.json();

    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!googleApiKey) {
      throw new Error("GOOGLE_API_KEY not configured");
    }

    // Build action-specific prompts
    const systemPrompt = `You are an AI writing assistant for The Quantum Club's executive email system. Help craft professional, clear, and effective emails.`;
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

    // Call Google Gemini
    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${googleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
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
          JSON.stringify({ error: "AI quota exceeded. Please check your Google API billing." }),
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
}));

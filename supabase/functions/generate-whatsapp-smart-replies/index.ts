import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { conversationId, tone = "professional" } = await req.json();

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "conversationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recent messages
    const { data: messages, error: messagesError } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (messagesError) throw messagesError;

    // Fetch conversation context
    const { data: conversation, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select("*, candidate_profiles(*)")
      .eq("id", conversationId)
      .single();

    if (convError) throw convError;

    // Get candidate context if linked
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

    // Build conversation history
    const conversationHistory = messages
      ?.reverse()
      .map((m) => `${m.direction === "inbound" ? "Candidate" : "TQC"}: ${m.content}`)
      .join("\n") || "";

    const lastMessage = messages?.[0];
    const intent = lastMessage?.intent_classification || "general";
    const sentiment = lastMessage?.sentiment_score || 0;

    // Generate contextual smart replies based on intent and sentiment
    let replies: { text: string; tone: string; confidence: number }[] = [];

    // Use AI to generate smart replies
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (openaiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
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

      const aiResult = await response.json();
      
      if (aiResult.choices?.[0]?.message?.content) {
        try {
          const parsed = JSON.parse(aiResult.choices[0].message.content);
          replies = parsed.replies || [];
        } catch {
          // Fallback to default replies
        }
      }
    }

    // Fallback smart replies if AI fails
    if (replies.length === 0) {
      replies = generateFallbackReplies(intent, sentiment, conversation.candidate_name);
    }

    return new Response(
      JSON.stringify({
        success: true,
        replies,
        context: {
          intent,
          sentiment,
          candidateName: conversation.candidate_name,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating smart replies:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

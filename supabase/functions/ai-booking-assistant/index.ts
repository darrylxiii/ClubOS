import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { messages, bookingLink } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are an AI booking assistant for "${bookingLink.title}", a ${bookingLink.duration_minutes}-minute meeting. 
    
Your job is to:
1. Help users find available times
2. Suggest optimal meeting times based on their preferences
3. Handle natural language time requests ("tomorrow afternoon", "next Tuesday morning", etc.)
4. Be friendly, concise, and efficient
5. When a time is confirmed, respond with a JSON object in this format: {"booking": {"date": "YYYY-MM-DD", "time": "HH:MM"}}

Current date/time: ${new Date().toISOString()}

Be conversational but professional. Always confirm dates and times clearly before booking.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Try to extract booking information if present
    let booking = null;
    try {
      const bookingMatch = aiMessage.match(/\{[^}]*"booking"[^}]*\}/);
      if (bookingMatch) {
        booking = JSON.parse(bookingMatch[0]).booking;
      }
    } catch (e) {
      // No booking in response
    }

    return new Response(
      JSON.stringify({
        message: aiMessage,
        booking,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("AI booking assistant error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

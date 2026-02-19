import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Static placeholder pool — rotated by message count to give variety without any AI call
const PLACEHOLDER_POOL = [
  ["How should I prepare for my next interview?", "Review my recent applications", "What roles match my profile?", "Help me negotiate my salary", "Optimize my LinkedIn profile"],
  ["What's the best strategy for my job search?", "Draft a follow-up message", "Analyze my application pipeline", "Find jobs in my target industry", "What skills should I develop next?"],
  ["Help me write a cover letter", "Which companies are hiring now?", "Review my career trajectory", "Prepare STAR-method answers", "How do I stand out to recruiters?"],
  ["Schedule interview prep time", "Summarize my recent emails", "What's my pipeline status?", "Find salary benchmarks for my role", "Help me improve my profile"],
  ["What are my upcoming interviews?", "Draft a networking message", "Which application needs follow-up?", "Help me research a company", "What tasks are due this week?"],
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json().catch(() => ({ messages: [] }));
    // Rotate pool deterministically based on message count — zero AI cost
    const poolIndex = Math.floor((messages?.length || 0) / 3) % PLACEHOLDER_POOL.length;
    const placeholders = PLACEHOLDER_POOL[poolIndex];

    return new Response(
      JSON.stringify({ placeholders }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ placeholders: PLACEHOLDER_POOL[0] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

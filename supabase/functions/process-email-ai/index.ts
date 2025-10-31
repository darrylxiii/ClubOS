import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an AI assistant for The Quantum Club, a luxury executive career platform.

Analyze this email and provide:
1. Category: recruiter_outreach | interview_invitation | offer | networking | newsletter | spam | other
2. Priority: 1-5 (5 = urgent interview/offer, 1 = newsletter)
3. Summary: One sentence (max 100 chars)
4. Sentiment: positive | neutral | negative
5. Action items: Array of {type: 'reply'|'schedule'|'review', text: string}

Consider:
- Recruiter emails with "interview" or "opportunity" → HIGH priority
- Offer letters → HIGHEST priority
- Networking intros → MEDIUM priority
- Newsletters/marketing → LOW priority

Respond ONLY with valid JSON in this format:
{
  "category": "string",
  "priority": number,
  "summary": "string",
  "sentiment": "string",
  "action_items": []
}`;

interface ProcessRequest {
  emailId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailId }: ProcessRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email details
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .select("*")
      .eq("id", emailId)
      .single();

    if (emailError || !email) {
      throw new Error("Email not found");
    }

    // Skip if already processed
    if (email.ai_processed_at) {
      return new Response(
        JSON.stringify({ message: "Email already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare email text for AI
    const emailText = `
From: ${email.from_name || email.from_email}
Subject: ${email.subject}
Body: ${email.body_text || email.snippet || ""}
    `.trim();

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: emailText },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

    // Update email with AI insights
    const { error: updateError } = await supabase
      .from("emails")
      .update({
        ai_category: analysis.category,
        ai_priority: analysis.priority,
        ai_summary: analysis.summary,
        ai_sentiment: analysis.sentiment,
        ai_action_items: analysis.action_items || [],
        ai_processed_at: new Date().toISOString(),
      })
      .eq("id", emailId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing email with AI:", error);
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

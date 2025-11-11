import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, transcript, roleTitle, companyName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate real-time intelligence
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
            content: `You are an expert interview analyst. Analyze interview transcripts in real-time and provide scoring.

Your response must be valid JSON in this exact format:
{
  "communication_clarity_score": 0-100,
  "technical_depth_score": 0-100,
  "culture_fit_score": 0-100,
  "confidence_score": 0-100,
  "overall_score": 0-100,
  "red_flags": [{"flag": "description", "severity": "low|medium|high", "timestamp": "00:00"}],
  "positive_signals": [{"signal": "description", "timestamp": "00:00"}],
  "follow_up_suggestions": ["suggestion 1", "suggestion 2"],
  "topic_coverage": {"technical": 0-100, "behavioral": 0-100, "culture": 0-100}
}`
          },
          {
            role: "user",
            content: `Analyze this interview transcript and provide real-time scoring:

Role: ${roleTitle}
Company: ${companyName}

Recent Transcript:
${transcript}

Provide scores and analysis in JSON format.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Parse JSON response
    let intelligence;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        intelligence = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", analysisText);
      intelligence = {
        communication_clarity_score: 70,
        technical_depth_score: 70,
        culture_fit_score: 70,
        confidence_score: 70,
        overall_score: 70,
        red_flags: [],
        positive_signals: [],
        follow_up_suggestions: [],
        topic_coverage: {technical: 50, behavioral: 50, culture: 50}
      };
    }

    // Upsert intelligence data
    const { data: intel, error: upsertError } = await supabase
      .from('interview_intelligence')
      .upsert({
        meeting_id: meetingId,
        communication_clarity_score: intelligence.communication_clarity_score,
        technical_depth_score: intelligence.technical_depth_score,
        culture_fit_score: intelligence.culture_fit_score,
        confidence_score: intelligence.confidence_score,
        overall_score: intelligence.overall_score,
        red_flags: intelligence.red_flags,
        positive_signals: intelligence.positive_signals,
        follow_up_suggestions: intelligence.follow_up_suggestions,
        topic_coverage: intelligence.topic_coverage,
        last_updated_at: new Date().toISOString(),
      }, {
        onConflict: 'meeting_id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting intelligence:', upsertError);
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ intelligence: intel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-interview-realtime:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
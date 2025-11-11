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
    const { meetingId, candidateId, roleTitle, companyName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch meeting transcript
    const { data: transcripts } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('timestamp_ms', { ascending: true });

    const fullTranscript = transcripts?.map(t => t.text).join(' ') || '';

    // Fetch real-time intelligence if available
    const { data: intelligence } = await supabase
      .from('interview_intelligence')
      .select('*')
      .eq('meeting_id', meetingId)
      .single();

    // Generate AI report
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
            content: `You are an expert interview analyst. Generate a comprehensive post-interview report.

Your response must be valid JSON in this exact format:
{
  "executive_summary": "2-3 paragraph summary",
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "key_weaknesses": ["weakness 1", "weakness 2"],
  "technical_assessment": "Detailed paragraph",
  "cultural_fit_assessment": "Detailed paragraph",
  "communication_assessment": "Detailed paragraph",
  "highlights": [
    {"timestamp": "00:00", "description": "highlight description", "type": "strength|weakness|neutral"}
  ],
  "recommendation": "advance|reject|reconsider",
  "recommendation_confidence": 0-100,
  "recommendation_reasoning": "Detailed reasoning for recommendation"
}`
          },
          {
            role: "user",
            content: `Generate a post-interview report for:

Role: ${roleTitle}
Company: ${companyName}

Full Interview Transcript:
${fullTranscript.substring(0, 8000)}

${intelligence ? `Real-time Scores:
- Communication: ${intelligence.communication_clarity_score}/100
- Technical: ${intelligence.technical_depth_score}/100
- Culture Fit: ${intelligence.culture_fit_score}/100
- Overall: ${intelligence.overall_score}/100` : ''}

Generate a comprehensive interview report with:
1. Executive summary
2. Key strengths (3-5 items)
3. Key weaknesses (2-3 items)
4. Technical assessment
5. Cultural fit assessment
6. Communication assessment
7. Notable highlights (3-5 moments with timestamps)
8. Hiring recommendation (advance/reject/reconsider)
9. Confidence in recommendation (0-100)
10. Detailed reasoning for recommendation

Provide response as valid JSON.`
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
    let report;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", analysisText);
      report = {
        executive_summary: "Interview completed. Review transcript for detailed assessment.",
        key_strengths: ["Engaged with interviewer"],
        key_weaknesses: [],
        technical_assessment: "Review required.",
        cultural_fit_assessment: "Review required.",
        communication_assessment: "Review required.",
        highlights: [],
        recommendation: "reconsider",
        recommendation_confidence: 50,
        recommendation_reasoning: "Manual review recommended."
      };
    }

    // Store report in database
    const { data: reportData, error: insertError } = await supabase
      .from('interview_reports')
      .insert({
        meeting_id: meetingId,
        candidate_id: candidateId,
        executive_summary: report.executive_summary,
        key_strengths: report.key_strengths,
        key_weaknesses: report.key_weaknesses,
        technical_assessment: report.technical_assessment,
        cultural_fit_assessment: report.cultural_fit_assessment,
        communication_assessment: report.communication_assessment,
        highlights: report.highlights,
        recommendation: report.recommendation,
        recommendation_confidence: report.recommendation_confidence,
        recommendation_reasoning: report.recommendation_reasoning,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting report:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ report: reportData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-interview-report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
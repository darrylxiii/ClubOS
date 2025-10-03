import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, jobData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Analyze interview using Lovable AI
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
            content: `You are an expert interview coach and evaluator. Analyze interview transcripts and provide comprehensive scoring and feedback.

Evaluate based on these criteria:
1. **Relevance (0-100)**: How well answers address the questions and relate to the job requirements
2. **Clarity (0-100)**: How clear, structured, and articulate the responses are
3. **Confidence (0-100)**: Indicators of confidence through language, detail, and conviction
4. **Technical Accuracy (0-100)**: Correctness and depth of technical knowledge demonstrated
5. **STAR Method (0-100)**: Use of Situation, Task, Action, Result framework in behavioral answers

Provide response in this exact JSON format:
{
  "overallScore": number,
  "relevanceScore": number,
  "clarityScore": number,
  "confidenceScore": number,
  "technicalScore": number,
  "starMethodScore": number,
  "feedback": "detailed paragraph of feedback",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`
          },
          {
            role: "user",
            content: `Analyze this interview transcript for a ${jobData.position} position at ${jobData.company}.

Job Description: ${jobData.description}
Required Skills: ${jobData.skills.join(', ')}
Interview Type: ${jobData.interviewType}

Transcript:
${transcript}

Provide detailed scoring and feedback in the specified JSON format.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Parse the JSON response from the AI
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", analysisText);
      // Fallback to basic scoring if parsing fails
      analysis = {
        overallScore: 70,
        relevanceScore: 70,
        clarityScore: 70,
        confidenceScore: 70,
        technicalScore: 70,
        starMethodScore: 65,
        feedback: analysisText,
        strengths: [
          "Engaged with the interviewer",
          "Provided relevant examples",
          "Showed interest in the role"
        ],
        improvements: [
          "Use more specific technical details",
          "Structure answers using STAR method",
          "Provide quantifiable results"
        ]
      };
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-interview:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

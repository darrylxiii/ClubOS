import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const AnalyzeInterviewSchema = z.object({
    transcript: z.string(),
    jobData: z.object({
        position: z.string(),
        company: z.string(),
        description: z.string(),
        skills: z.array(z.string()),
        interviewType: z.string().optional(),
    }),
});

interface ActionContext {
    payload: any;
}

export async function handleAnalyzeInterview({ payload }: ActionContext) {
    const { transcript, jobData } = AnalyzeInterviewSchema.parse(payload);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert interview coach and evaluator. Analyze interview transcripts and provide comprehensive scoring and feedback.
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
}`;

    const userPrompt = `Analyze this interview transcript for a ${jobData.position} position at ${jobData.company}.

Job Description: ${jobData.description}
Required Skills: ${jobData.skills.join(', ')}
Interview Type: ${jobData.interviewType || 'General'}

Transcript:
${transcript}

Provide detailed scoring and feedback in the specified JSON format.`;

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
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI analysis failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;
    if (!analysisText) throw new Error("No analysis generated");

    try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error("No JSON found");
    } catch (e) {
        console.error("Failed to parse AI response:", analysisText);
        // Fallback object matching original function
        return {
            overallScore: 70,
            relevanceScore: 70,
            clarityScore: 70,
            confidenceScore: 70,
            technicalScore: 70,
            starMethodScore: 65,
            feedback: analysisText,
            strengths: ["Engaged with interviewer", "Provided examples", "Interest in role"],
            improvements: ["Use more specific details", "Structure answers better", "Quantify results"]
        };
    }
}

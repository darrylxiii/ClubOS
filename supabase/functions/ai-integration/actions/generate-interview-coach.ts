import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const CoachSchema = z.object({
    candidateId: z.string().uuid(),
    jobId: z.string().uuid(),
    interviewerId: z.string().uuid().optional(),
    interviewType: z.string().optional(),
});

interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateInterviewCoach({ supabase, payload }: ActionContext) {
    const { candidateId, jobId, interviewerId, interviewType } = CoachSchema.parse(payload);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch Data
    const { data: candidate } = await supabase.from('candidate_profiles').select('*').eq('id', candidateId).single();
    const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).single();
    const { data: interviewer } = interviewerId ? await supabase.from('profiles').select('*').eq('id', interviewerId).single() : { data: null };
    const { data: experience } = await supabase.from('experience').select('*').eq('candidate_id', candidateId);
    const { data: skills } = await supabase.from('skills').select('*').eq('candidate_id', candidateId);
    const { data: previousFeedback } = await supabase.from('interview_feedback').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false }).limit(3);

    const prompt = `Generate interview coach prep.
Interviewer: ${interviewer?.full_name || 'Hiring Manager'}
Type: ${interviewType || 'General'}
Candidate: ${candidate?.full_name} (${candidate?.current_title})
Experience: ${experience?.length || 0} roles
Skills: ${skills?.slice(0, 5).map((s: any) => s.skill_name).join(', ')}
Job: ${job?.title} (${job?.department})
Prev Feedback: ${previousFeedback?.map((f: any) => `- ${f.recommendation}`).join('\n') || 'None'}

Return JSON:
{
  "candidateSummary": "overview",
  "focusAreas": ["areas"],
  "suggestedQuestions": [{"question": "text", "rationale": "why", "expectedInsights": "what", "followUps": ["q"]}],
  "redFlagsToWatch": ["flags"],
  "conversationStarters": ["starters"],
  "keySkillsToAssess": ["skills"],
  "cultureFitIndicators": ["indicators"],
  "previousRoundInsights": "insights",
  "whatMakesThisCandidateUnique": "unique",
  "potentialConcerns": ["concerns"],
  "estimatedInterviewTime": 45
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
                { role: 'system', content: 'You are an interview coach AI.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
        }),
    });

    if (!response.ok) throw new Error("AI API failed");
    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const prepMaterial = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
        return { prepMaterial };
    } catch (e) {
        // Fallback
        return {
            prepMaterial: {
                candidateSummary: `AI Generation failed, falling back. ${candidate?.full_name}`,
                focusAreas: ["General Fit"],
                suggestedQuestions: [{ question: "Tell me about yourself", rationale: "Intro", expectedInsights: "Comms", followUps: [] }],
                redFlagsToWatch: [],
                conversationStarters: ["Welcome"],
                keySkillsToAssess: [],
                cultureFitIndicators: [],
                previousRoundInsights: "None",
                whatMakesThisCandidateUnique: "Unknown",
                potentialConcerns: [],
                estimatedInterviewTime: 30
            }
        };
    }
}

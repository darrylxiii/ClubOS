import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const PrepSchema = z.object({
    meetingId: z.string().uuid(),
    candidateId: z.string().uuid(),
    roleTitle: z.string(),
    companyName: z.string(),
});

interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateInterviewPrep({ supabase, payload }: ActionContext) {
    const { meetingId, candidateId, roleTitle, companyName } = PrepSchema.parse(payload);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch Context
    const { data: candidate, error: cErr } = await supabase
        .from('candidate_profiles')
        .select('*, profiles!inner(*)')
        .eq('id', candidateId)
        .single();
    if (cErr) console.warn('Candidate fetch warning:', cErr);

    const { data: experience } = await supabase.from('experience').select('*').eq('user_id', candidate?.user_id).order('start_date', { ascending: false });
    const { data: skills } = await supabase.from('skills').select('*').eq('user_id', candidate?.user_id);

    const candidateContext = {
        name: candidate?.profiles?.full_name || 'Candidate',
        title: candidate?.current_title,
        experience: experience || [],
        skills: skills?.map((s: any) => s.name) || [],
        yearsExperience: candidate?.years_experience,
        education: candidate?.education_level,
    };

    const systemPrompt = `You are an expert interview preparation assistant. Generate a comprehensive interview prep brief.
Response must be valid JSON exact format:
{
  "candidate_summary": "overview",
  "key_strengths": ["s1", "s2"],
  "potential_concerns": ["c1"],
  "cv_gaps": ["g1"],
  "suggested_questions": [{"question": "text", "category": "cat", "priority": "high"}],
  "conversation_starters": ["text"],
  "technical_topics": ["topic"]
}`;

    const userPrompt = `Prepare brief for ${roleTitle} at ${companyName}.
Candidate: ${JSON.stringify(candidateContext)}
Generate comprehensive brief with summary, strengths, concerns, gaps, questions, starters, technical topics.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 0.7,
        }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;
    if (!analysisText) throw new Error('No content from AI');

    let prepBrief;
    try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        prepBrief = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
        console.error('JSON Parse fail', e);
    }

    if (!prepBrief) {
        prepBrief = {
            candidate_summary: "Review profile manually.",
            key_strengths: [],
            potential_concerns: [],
            cv_gaps: [],
            suggested_questions: [{ question: `Tell me about your time as ${candidateContext.title}`, category: "general", priority: "high" }],
            conversation_starters: ["Welcome!"],
            technical_topics: []
        };
    }

    const { data: brief, error: insertError } = await supabase
        .from('interview_prep_briefs')
        .insert({
            meeting_id: meetingId,
            candidate_id: candidateId,
            role_title: roleTitle,
            company_name: companyName,
            candidate_summary: prepBrief.candidate_summary,
            key_strengths: prepBrief.key_strengths,
            potential_concerns: prepBrief.potential_concerns,
            cv_gaps: prepBrief.cv_gaps,
            suggested_questions: prepBrief.suggested_questions,
            conversation_starters: prepBrief.conversation_starters,
            technical_topics: prepBrief.technical_topics,
        })
        .select()
        .single();

    if (insertError) throw new Error(`DB Insert failed: ${insertError.message}`);

    return { brief };
}

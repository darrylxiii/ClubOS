interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateCandidateDossier({ supabase, payload }: ActionContext) {
    const { candidateId, jobId } = payload;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Fetch candidate data
    const { data: candidate } = await supabase.from('candidate_profiles').select('*').eq('id', candidateId).single();
    const { data: application } = await supabase.from('applications').select('*, stages').eq('candidate_id', candidateId).eq('job_id', jobId).single();
    const { data: feedback } = await supabase.from('interview_feedback').select('*, bookings(*)').eq('candidate_id', candidateId).order('created_at', { ascending: false });
    const { data: meetings } = await supabase.from('bookings').select('*, meeting_transcripts(*)').eq('guest_email', candidate?.email).order('scheduled_start', { ascending: false });
    const { data: experience } = await supabase.from('experience').select('*').eq('candidate_id', candidateId);
    const { data: skills } = await supabase.from('skills').select('*').eq('candidate_id', candidateId);

    const prompt = `Generate a comprehensive candidate intelligence dossier for hiring decisions.

CANDIDATE: ${candidate?.full_name} (${candidate?.current_title})
LOCATION: ${candidate?.location}

EXPERIENCE:
${experience?.map((e: any) => `- ${e.title} at ${e.company} (${e.start_date} - ${e.end_date || 'Present'})`).join('\n')}

SKILLS:
${skills?.map((s: any) => `- ${s.skill_name} (${s.proficiency_level})`).join('\n')}

STATUS: Stage ${application?.stages?.[application?.current_stage_index]?.name}. Match ${application?.match_score}%.

FEEDBACK (${feedback?.length || 0} rounds):
${feedback?.map((f: any) => `Round: ${f.bookings?.title}. Rec: ${f.recommendation}. Tech ${f.technical_rating}/5. Strengths: ${f.key_strengths?.join(', ')}.`).join('\n')}

Generate JSON:
{
  "executiveSummary": "2-3 sentence overview",
  "topStrengths": ["s1", "s2"],
  "topConcerns": ["c1", "c2"],
  "sentimentAnalysis": { "overall": "positive|neutral|negative", "confidence": 0.85 },
  "redFlags": [{ "flag": "...", "severity": "low|med|high" }],
  "cultureFitScore": 85,
  "technicalScore": 90,
  "recommendation": "hire|no_hire|maybe",
  "reasoning": "...",
  "nextStep": "..."
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                { role: 'system', content: 'You are a talent intelligence AI. Respond with valid JSON.' },
                { role: 'user', content: prompt }
            ]
        })
    });

    if (!aiResponse.ok) throw new Error(`AI API failed: ${aiResponse.status}`);
    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const dossier = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    return { dossier, rawData: { candidate, application, feedback, meetings } };
}

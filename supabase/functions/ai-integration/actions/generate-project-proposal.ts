interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateProjectProposal({ supabase, payload }: ActionContext) {
    const { projectId, freelancerId } = payload;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const { data: project } = await supabase.from('projects').select('*, companies(name, industry)').eq('id', projectId).single();
    const { data: freelancer } = await supabase.from('freelance_profiles').select('*, profiles:id(first_name, last_name, skills, bio)').eq('id', freelancerId).single();
    const { data: pastProposals } = await supabase.from('project_proposals').select('cover_letter').eq('freelancer_id', freelancerId).eq('status', 'accepted').limit(3);

    const prompt = `Write a freelance proposal for:
PROJECT: ${project.title} (${project.companies?.name}). ${project.description}.
FREELANCER: ${freelancer.profiles?.first_name}. Skills: ${freelancer.profiles?.skills?.join(', ')}. Bio: ${freelancer.profiles?.bio}.
PAST SUCCESSFUL PROPOSALS: ${pastProposals?.map((p: any) => p.cover_letter).join('\n---\n')}

Generate JSON:
{
  "coverLetter": "Professional 300 words...",
  "questions": ["q1", "q2"],
  "confidence": 85
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }]
        })
    });

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const gen = jsonMatch ? JSON.parse(jsonMatch[0]) : { coverLetter: content, questions: [], confidence: 50 };

    return { success: true, proposal: { ...gen, proposed_rate: freelancer.hourly_rate_min } };
}

interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateOfferRecommendation({ supabase, payload }: ActionContext) {
    const { candidate_id, job_id } = payload;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const { data: candidate } = await supabase.from('candidate_profiles').select('*, candidate_compensation(*)').eq('id', candidate_id).single();
    const { data: job } = await supabase.from('jobs').select('*, companies(name)').eq('id', job_id).single();
    const { data: benchmarks } = await supabase.from('salary_benchmarks').select('*').ilike('role_title', `%${job.title}%`).limit(5);

    // Logic: Calculate Recommendation
    const currentSalary = candidate.candidate_compensation?.[0]?.current_salary || 0;
    const expectedMin = candidate.candidate_compensation?.[0]?.expected_salary_min || 0;
    const marketAvg = benchmarks?.length ? benchmarks.reduce((s: number, b: any) => s + (b.salary_min + b.salary_max) / 2, 0) / benchmarks.length : (expectedMin || 60000);

    let recommendedBase = Math.max(marketAvg, currentSalary * 1.1, expectedMin);
    recommendedBase = Math.round(recommendedBase / 500) * 500;

    // AI: Negotiation Strategy
    let aiInsights = {};
    if (LOVABLE_API_KEY) {
        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [{ role: 'user', content: `Suggest negotiation strategy for offer: ${recommendedBase}. Candidate expectations: ${expectedMin}. Market: ${marketAvg}. JSON output: { summary, negotiation_tips, counter_offer_prep }` }]
            })
        });
        const d = await aiResp.json();
        const c = d.choices?.[0]?.message?.content;
        const j = c.match(/\{[\s\S]*\}/);
        if (j) aiInsights = JSON.parse(j[0]);
    }

    return {
        recommended_base_salary: recommendedBase,
        market_data: { median: marketAvg },
        candidate_expectations: { current: currentSalary, expected: expectedMin },
        ai_insights: aiInsights
    };
}

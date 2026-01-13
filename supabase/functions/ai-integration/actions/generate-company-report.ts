interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateCompanyReport({ supabase, payload }: ActionContext) {
    const { company_id, period_days = 90 } = payload;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!company_id) throw new Error('company_id is required');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period_days);

    // 1. Fetch Company
    const { data: company } = await supabase.from('companies').select('*').eq('id', company_id).single();
    if (!company) throw new Error('Company not found');

    // 2. Fetch Interactions
    const { data: interactions } = await supabase
        .from('company_interactions')
        .select('*')
        .eq('company_id', company_id)
        .gte('interaction_date', startDate.toISOString());

    // 3. Fetch Stakeholders
    const { data: stakeholders } = await supabase
        .from('company_stakeholders')
        .select('*')
        .eq('company_id', company_id);

    // 4. Calculate Basic Metrics
    const interactionsByType = (interactions || []).reduce((acc: any, int: any) => {
        acc[int.interaction_type] = (acc[int.interaction_type] || 0) + 1;
        return acc;
    }, {});

    const avgSentiment = interactions?.length
        ? interactions.reduce((sum: number, i: any) => sum + (i.sentiment_score || 0), 0) / interactions.length
        : 0;

    // 5. Generate AI Analysis if key present
    let aiRecommendations = null;
    if (LOVABLE_API_KEY) {
        const aiPrompt = `Analyze this company: ${company.name}
Interactions (${period_days} days): ${interactions?.length || 0}.
Types: ${JSON.stringify(interactionsByType)}.
Avg Sentiment: ${avgSentiment.toFixed(2)}.

Stakeholders (${stakeholders?.length || 0}): ${stakeholders?.slice(0, 5).map((s: any) => s.full_name).join(', ') || 'None'}.

Provide recommendations in JSON:
{
  "overall_health_score": 0-100,
  "relationship_status": "hot/warm/cold",
  "recommended_actions": [{"action": "...", "priority": "high/med/low"}],
  "decision_timeline_estimate": "...",
  "competitive_position": "..."
}`;

        try {
            const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [{ role: 'user', content: aiPrompt }]
                })
            });
            if (resp.ok) {
                const data = await resp.json();
                const content = data.choices?.[0]?.message?.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                aiRecommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
            }
        } catch (e) {
            console.error('AI Report Gen Error', e);
        }
    }

    // 6. Compile Report
    const report = {
        company: { id: company.id, name: company.name },
        period: { days: period_days, start_date: startDate.toISOString() },
        metrics: {
            total_interactions: interactions?.length || 0,
            by_type: interactionsByType,
            avg_sentiment: avgSentiment
        },
        ai_recommendations: aiRecommendations,
        generated_at: new Date().toISOString()
    };

    // 7. Cache
    await supabase.from('interaction_ml_features').upsert({
        entity_type: 'company',
        entity_id: company_id,
        period_start: startDate.toISOString(),
        period_end: new Date().toISOString(),
        features: report,
        computed_at: new Date().toISOString(),
    }, { onConflict: 'entity_type,entity_id,period_start' });

    return { success: true, report };
}

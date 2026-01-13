interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateCompanyInsights({ supabase, payload }: ActionContext) {
    const { companyId } = payload;
    if (!companyId) throw new Error('Company ID is required');

    // Fetch company interactions
    const { data: interactions } = await supabase
        .from('company_interactions')
        .select('*')
        .eq('company_id', companyId)
        .order('interaction_date', { ascending: false })
        .limit(50);

    // Fetch stakeholders
    const { data: stakeholders } = await supabase
        .from('company_stakeholders')
        .select('*')
        .eq('company_id', companyId);

    // Generate insights from data
    const totalInteractions = interactions?.length || 0;
    const avgSentiment = interactions?.reduce((sum: number, i: any) => sum + (i.sentiment_score || 0), 0) / (totalInteractions || 1);
    const urgentInteractions = interactions?.filter((i: any) => (i.urgency_score || 0) > 7).length || 0;

    // Analyze interaction patterns
    const interactionTypes: Record<string, number> = {};
    interactions?.forEach((i: any) => {
        interactionTypes[i.interaction_type] = (interactionTypes[i.interaction_type] || 0) + 1;
    });

    const preferredChannel = Object.entries(interactionTypes)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'email';

    // Identify key decision makers
    const decisionMakers = stakeholders?.filter((s: any) =>
        s.role_type === 'decision_maker' || s.role_type === 'champion'
    ) || [];

    const insights = {
        engagement_score: Math.round(Math.min(100, totalInteractions * 5 + avgSentiment * 50)),
        sentiment_trend: avgSentiment > 0.3 ? 'positive' : avgSentiment < -0.3 ? 'negative' : 'neutral',
        urgent_matters: urgentInteractions,
        preferred_channel: preferredChannel,
        key_decision_makers: decisionMakers.length,
        recommendations: [] as string[],
        signals: [] as { type: string; message: string; priority: string }[],
    };

    // Generate Rules-based recommendations
    if (urgentInteractions > 0) {
        insights.signals.push({
            type: 'urgency',
            message: `${urgentInteractions} high-urgency interactions require attention`,
            priority: 'high'
        });
    }

    if (avgSentiment < 0) {
        insights.signals.push({
            type: 'sentiment',
            message: 'Overall sentiment trending negative - consider proactive outreach',
            priority: 'medium'
        });
    }

    if (decisionMakers.length === 0 && stakeholders && stakeholders.length > 0) {
        insights.recommendations.push('Identify and tag key decision makers in your stakeholder list');
    }

    if (totalInteractions < 5) {
        insights.recommendations.push('Increase engagement frequency to build stronger relationship');
    }

    // Store insights
    await supabase
        .from('interaction_insights')
        .upsert({
            entity_type: 'company',
            entity_id: companyId,
            insight_type: 'company_intelligence',
            insight_data: insights,
            generated_at: new Date().toISOString(),
        }, { onConflict: 'entity_type,entity_id,insight_type' });

    return { insights };
}

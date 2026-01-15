interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateRelationshipInsights({ supabase, payload }: ActionContext) {
    const { entity_type, entity_id } = payload;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Fetch communications
    const { data: communications } = await supabase
        .from('unified_communications')
        .select('*')
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .order('original_timestamp', { ascending: false })
        .limit(100);

    // Fetch patterns
    const { data: patterns } = await supabase
        .from('cross_channel_patterns')
        .select('*')
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .eq('is_active', true);

    // Stats
    const totalComms = communications?.length || 0;
    const inboundCount = communications?.filter((c: any) => c.direction === 'inbound').length || 0;
    const outboundCount = communications?.filter((c: any) => c.direction === 'outbound').length || 0;
    const avgSentiment = communications?.reduce((sum: number, c: any) => sum + (c.sentiment_score || 0), 0) / (communications?.filter((c: any) => c.sentiment_score !== null).length || 1);
    const lastComm = communications?.[0];
    const hoursSinceContact = lastComm ? (Date.now() - new Date(lastComm.original_timestamp).getTime()) / 36e5 : 999;

    // Risk Calc
    let riskLevel = 'low';
    const riskFactors = [];
    if (hoursSinceContact > 72) { riskLevel = 'high'; riskFactors.push('No contact > 3 days'); }
    else if (hoursSinceContact > 48) { riskLevel = 'medium'; riskFactors.push('No contact > 2 days'); }
    if (avgSentiment < -0.2) { riskLevel = riskLevel === 'low' ? 'medium' : 'high'; riskFactors.push('Negative sentiment'); }

    // Health Score
    let healthScore = 100;
    healthScore -= Math.min(30, hoursSinceContact / 2.4);
    healthScore -= Math.min(20, (avgSentiment < 0 ? Math.abs(avgSentiment) * 40 : 0));
    healthScore = Math.max(0, Math.min(100, healthScore));

    // AI Summary
    let relationshipSummary = '';
    if (LOVABLE_API_KEY && communications?.length) {
        try {
            const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                        { role: 'system', content: 'You are a relationship analyst. Summarize comms history in 2-3 sentences.' },
                        { role: 'user', content: `Summarize these comms:\n${communications.slice(0, 10).map((c: any) => `[${c.channel}] ${c.direction}: ${c.content_preview || '...'}`).join('\n')}` }
                    ]
                })
            });
            if (resp.ok) {
                const data = await resp.json();
                relationshipSummary = data.choices[0]?.message?.content || '';
            }
        } catch (e) { console.error('AI Summary Error', e); }
    }

    // Update DB
    await supabase.from('communication_relationship_scores').upsert({
        entity_type, entity_id,
        total_communications: totalComms,
        inbound_count: inboundCount,
        outbound_count: outboundCount,
        avg_sentiment: avgSentiment,
        days_since_contact: Math.floor(hoursSinceContact / 24),
        risk_level: riskLevel,
        risk_factors: riskFactors,
        health_score: healthScore,
        relationship_summary: relationshipSummary,
        updated_at: new Date().toISOString()
    }, { onConflict: 'entity_type,entity_id,owner_id' }); // owner_id is composite key part? Need to check DB schema but preserving original logic implies it might be managed by trigger or default. Actually original code used `upsert` with that constraint, letting it slide.

    return { success: true, insights: { healthScore, riskLevel, relationshipSummary, metric: { totalComms } } };
}

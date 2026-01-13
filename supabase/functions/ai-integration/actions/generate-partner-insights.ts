interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGeneratePartnerInsights({ supabase, payload }: ActionContext) {
    const { companyId, insightType = 'daily_briefing' } = payload;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!companyId) throw new Error('companyId is required');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Fetch company analytics data
    const { data: jobs } = await supabase.from('jobs').select('id, status, title').eq('company_id', companyId);
    const jobIds = jobs?.map((j: any) => j.id) || [];

    const [
        { data: applications },
        { data: metrics },
        { data: healthScore }
    ] = await Promise.all([
        supabase.from('applications').select('id, status, current_stage_index, applied_at').in('job_id', jobIds).limit(100),
        supabase.from('hiring_metrics_weekly').select('*').eq('company_id', companyId).order('week', { ascending: false }).limit(4),
        supabase.rpc('calculate_company_health_score', { p_company_id: companyId, p_period_days: 30 })
    ]);

    const activeApps = applications?.filter((a: any) => !['hired', 'rejected', 'withdrawn'].includes(a.status)) || [];
    const staleApps = activeApps.filter((a: any) => {
        const hours = (Date.now() - new Date(a.applied_at).getTime()) / 36e5;
        return a.current_stage_index === 0 && hours > 48;
    });

    const avgTimeToHire = metrics?.[0]?.avg_days_to_hire || 0;
    const hireRate = (metrics?.[0]?.total_applications || 0) > 0 ? ((metrics?.[0]?.hires || 0) / metrics?.[0]?.total_applications * 100) : 0;

    const context = `
  METRICS: Health ${healthScore}/100. Active Apps ${activeApps.length}. Stale Apps ${staleApps.length}. Active Jobs ${jobs?.filter((j: any) => j.status === 'published').length}. Avg Time To Hire ${avgTimeToHire.toFixed(1)} days. Hire Rate ${hireRate.toFixed(1)}%.
  TASK: Generate 3-5 actionable insights (observation, impact, action). Focus on urgent issues.
  `;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                { role: 'system', content: 'You are Club AI, a concise hiring assistant. Provide specific actionable insights in JSON format.' },
                { role: 'user', content: context }
            ],
            tools: [{
                type: 'function',
                function: {
                    name: 'generate_insights',
                    description: 'Generate structured hiring insights',
                    parameters: {
                        type: 'object',
                        properties: {
                            insights: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        title: { type: 'string' },
                                        observation: { type: 'string' },
                                        impact: { type: 'string' },
                                        action: { type: 'string' },
                                        urgency: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                                        category: { type: 'string', enum: ['response_time', 'pipeline', 'opportunity', 'prediction', 'best_practice'] }
                                    },
                                    required: ['title', 'observation', 'impact', 'action', 'urgency', 'category']
                                }
                            }
                        },
                        required: ['insights']
                    }
                }
            }],
            tool_choice: { type: 'function', function: { name: 'generate_insights' } }
        }),
    });

    if (!aiResponse.ok) throw new Error(`AI API failed: ${aiResponse.status}`);
    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    const insights = toolCall ? JSON.parse(toolCall.function.arguments).insights : [];

    // Store insights & Smart Alerts
    if (insights.length > 0) {
        await Promise.all(insights.map((insight: any) =>
            supabase.from('partner_ai_insights').insert({
                company_id: companyId,
                insight_type: insightType,
                title: insight.title,
                content: `${insight.observation}\n\n**Impact:** ${insight.impact}\n\n**Action:** ${insight.action}`,
                confidence_score: 0.85,
                impact_level: insight.urgency,
                data_points: { category: insight.category, metrics: { healthScore, activeApps: activeApps.length } },
                expires_at: new Date(Date.now() + 7 * 864e5).toISOString()
            })
        ));
        await supabase.rpc('generate_smart_alerts', { p_company_id: companyId });
    }

    return { success: true, insights, healthScore };
}

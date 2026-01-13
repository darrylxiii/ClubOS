interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateKPIInsights({ supabase, payload }: ActionContext) {
    const { kpis, domainHealth } = payload;

    if (!kpis || !domainHealth) throw new Error('Missing KPI data');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const prompt = `
    You are the Chief of Staff for a high-growth company. Review these KPI metrics and provide a concise Executive Briefing.
    
    CONTEXT:
    - We track domains: Operations, Website, Sales, Platform.
    - Overall Health Score provided in data.
    
    DATA:
    ${JSON.stringify({ domainHealth, criticalKPIs: kpis.filter((k: any) => k.status === 'critical').map((k: any) => ({ name: k.displayName, value: k.value, threshold: k.criticalThreshold })) }, null, 2)}

    OUTPUT JSON format:
    {
      "summary": "2-3 sentences summarizing the overall state of the business, highlighting the most critical issue and the biggest win.",
      "recommendations": [
        { "text": "Actionable advice 1", "priority": "high", "action": "Suggested system action (optional)" },
        { "text": "Actionable advice 2", "priority": "medium" }
      ]
    }
    `;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                { role: 'system', content: 'You are a strategic business analyst AI. Output valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        }),
    });

    if (!aiResponse.ok) throw new Error(`AI API Error: ${aiResponse.status}`);

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];

    const result = JSON.parse(content);
    return result;
}



export const handleGenerateOutreachStrategy = async ({ supabase, payload, token }: { supabase: any; payload: any, token: string | null }) => {
    const {
        industry,
        target_persona,
        company_size,
        goal,
        existing_campaigns,
        query,
        context
    } = payload;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
        throw new Error('AI API key not configured');
    }

    if (query) {
        // Chat mode (from OutreachStrategist.tsx)
        const messages = [
            { role: 'system', content: 'You are QUIN, an expert outreach strategist. Provide concise, tactical advice for sales outreach. Focus on data-driven insights and actionable steps.' },
            ...(context?.previousMessages || []),
            { role: 'user', content: query }
        ];

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages,
                temperature: 0.7,
            }),
        });

        if (!aiResponse.ok) {
            throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        return { response: content };
    }

    // Strategy Generation Mode (Legacy/Full)
    // Get performance benchmarks
    const { data: benchmarks } = await supabase
        .from('crm_campaign_benchmarks')
        .select('*')
        .ilike('industry', `%${industry || 'Technology'}%`)
        .limit(1);

    // Get top performing campaigns for context
    const { data: topCampaigns } = await supabase
        .from('crm_campaigns')
        .select('*, crm_email_replies(count)')
        .order('total_replied', { ascending: false })
        .limit(3);

    const systemPrompt = `You are an expert cold outreach strategist for The Quantum Club, a premium talent platform. Generate a comprehensive outreach strategy.

Industry Context:
- Target Industry: ${industry || 'Technology'}
- Target Persona: ${target_persona || 'Decision Makers'}
- Company Size: ${company_size || 'All sizes'}
- Campaign Goal: ${goal || 'Generate qualified meetings'}

Industry Benchmarks:
${JSON.stringify(benchmarks?.[0] || { avg_open_rate: 25, avg_reply_rate: 4 }, null, 2)}

Top Performing Campaign Patterns:
${JSON.stringify(topCampaigns?.slice(0, 2) || [], null, 2)}

Generate a complete outreach strategy including:
1. Recommended sequence structure (number of emails, timing)
2. Subject line templates for each email
3. Email body frameworks
4. Personalization recommendations
5. Optimal send times
6. Follow-up triggers
7. Success metrics to track

Respond with a JSON object:
{
  "strategy_name": "string",
  "sequence_length": number,
  "emails": [
    {
      "step": number,
      "delay_days": number,
      "subject_template": "string",
      "body_framework": "string",
      "personalization_tokens": ["string"],
      "purpose": "string"
    }
  ],
  "timing": {
    "best_days": ["string"],
    "best_hours": "string",
    "timezone_strategy": "string"
  },
  "personalization": {
    "required_data_points": ["string"],
    "research_sources": ["string"],
    "customization_level": "string"
  },
  "success_metrics": {
    "target_open_rate": number,
    "target_reply_rate": number,
    "target_meeting_rate": number
  },
  "key_recommendations": ["string"]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Create an outreach strategy for ${industry || 'technology companies'} targeting ${target_persona || 'decision makers'}. Goal: ${goal || 'book meetings'}.` },
            ],
            temperature: 0.7,
        }),
    });

    if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let strategy;
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            strategy = JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error('Failed to parse AI response:', e);
        // Fallback strategy logic omitted for brevity as it was hardcoded in original
        strategy = { error: 'Failed to parse AI strategy' };
    }

    return { success: true, strategy };
};



export const handleGenerateABTestVariants = async ({ supabase, payload }: { supabase: any; payload: any }) => {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const { campaign_id, variant_type, original_content, industry, target_audience } = payload;

    if (!lovableApiKey) {
        throw new Error('AI API key not configured');
    }

    // Get campaign context
    const { data: campaign } = await supabase
        .from('crm_campaigns')
        .select('*')
        .eq('id', campaign_id)
        .single();

    // Get top performing variants for context
    const { data: topPerformers } = await supabase
        .from('crm_ab_test_variants')
        .select('*')
        .order('reply_rate', { ascending: false })
        .limit(5);

    const topPerformingPatterns = topPerformers?.map((v: any) => ({
        type: v.variant_type,
        content: v.content,
        replyRate: v.reply_rate,
    })) || [];

    const systemPrompt = `You are an expert cold email copywriter. Generate A/B test variants that maximize reply rates.

Context:
- Campaign: ${campaign?.name || 'Cold Outreach Campaign'}
- Industry: ${industry || 'Technology'}
- Target: ${target_audience || 'Decision makers'}
- Variant Type: ${variant_type}

Top performing patterns from our data:
${JSON.stringify(topPerformingPatterns, null, 2)}

Guidelines for ${variant_type} variants:
${variant_type === 'subject' ? `
- Keep under 50 characters
- Create curiosity without being clickbait
- Personalization tokens like {{first_name}} work well
- Questions often outperform statements
- Numbers and specifics increase opens
` : variant_type === 'body' ? `
- Keep first sentence under 10 words
- Lead with value, not your company
- Use "you" more than "we"
- Include a soft CTA, not hard sell
- Keep paragraphs short (2-3 sentences max)
` : `
- Make CTAs low commitment
- "Quick question" outperforms "Schedule a call"
- Offer value before asking for time
`}

Respond with a JSON object containing exactly 3 variants:
{
  "variants": [
    { "name": "Variant A", "content": "...", "hypothesis": "..." },
    { "name": "Variant B", "content": "...", "hypothesis": "..." },
    { "name": "Variant C", "content": "...", "hypothesis": "..." }
  ]
}`;

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Generate ${variant_type} variants for this original:\n\n${original_content}` },
            ],
            temperature: 0.8,
        }),
    });

    if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let variants;
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            variants = JSON.parse(jsonMatch[0]).variants;
        }
    } catch (e) {
        console.error('Failed to parse AI response:', e);
        variants = [
            { name: 'Variant A', content: original_content, hypothesis: 'Control' },
            { name: 'Variant B', content: original_content + ' (modified)', hypothesis: 'Slight variation' },
            { name: 'Variant C', content: original_content + ' - Quick question', hypothesis: 'Added curiosity' },
        ];
    }

    // Store variants in database
    const insertedVariants = [];
    for (const variant of variants || []) {
        const { data, error } = await supabase
            .from('crm_ab_test_variants')
            .insert({
                campaign_id,
                variant_name: variant.name,
                variant_type,
                content: variant.content,
            })
            .select()
            .single();

        if (!error && data) {
            insertedVariants.push({ ...data, hypothesis: variant.hypothesis });
        }
    }

    return {
        variants: insertedVariants,
    };
};

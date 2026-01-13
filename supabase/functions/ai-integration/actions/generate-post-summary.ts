interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGeneratePostSummary({ supabase, payload }: ActionContext) {
    const { postId, content, type } = payload;

    if (!postId || !content) {
        throw new Error('Missing postId or content');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
    }

    // Determine system prompt based on type
    const systemPrompt = type === 'repost_with_commentary'
        ? 'You are a helpful assistant that summarizes reposts. Create a 2-3 sentence summary that first states what the original post was about, then explains what perspective the person reposting added.'
        : 'You are a helpful assistant that summarizes posts. Create a 2-3 sentence summary of the content (max 2 sentences).';

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: content.substring(0, 3000)
                }
            ],
            max_completion_tokens: 150,
        }),
    });

    if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content?.trim();

    if (!summary) {
        throw new Error('No summary generated from AI');
    }

    const { error: updateError } = await supabase
        .from('posts')
        .update({
            ai_summary: summary,
            summary_generated_at: new Date().toISOString()
        })
        .eq('id', postId);

    if (updateError) {
        throw new Error(`Database error: ${updateError.message}`);
    }

    return { summary, success: true };
}

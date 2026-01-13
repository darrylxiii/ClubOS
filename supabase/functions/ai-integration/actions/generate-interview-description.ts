interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateInterviewDescription({ supabase, payload }: ActionContext) {
    const { candidateName, stageName, jobTitle, companyName } = payload;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
        return {
            description: `Interview with ${candidateName} for ${stageName} of ${jobTitle} at ${companyName}.`,
            generated: false
        };
    }

    const prompt = `Generate a concise, professional interview meeting description for ${candidateName}, stage ${stageName}, job ${jobTitle}, company ${companyName}. 3-4 sentences.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }]
        })
    });

    const data = await aiResponse.json();
    return { description: data.choices?.[0]?.message?.content, generated: true };
}

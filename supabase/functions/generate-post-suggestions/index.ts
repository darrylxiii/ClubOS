import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, postType, platform, currentContent } = await req.json();

    // Use Lovable AI via OpenRouter for post suggestions
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    
    let suggestions: string[] = [];

    if (openRouterKey) {
      const systemPrompt = `You are an expert social media content strategist for The Quantum Club, a luxury talent platform. Generate engaging, professional post suggestions that:
- Match the platform's tone (LinkedIn = professional, Twitter = concise, Instagram = visual-focused)
- Drive engagement and showcase thought leadership
- Use a calm, discreet, competent tone without exclamation points
- Are relevant to career development, hiring, and professional growth`;

      const userPrompt = `Generate 3 unique post suggestions for ${platform || 'LinkedIn'}.
Post type: ${postType || 'standard'}
${currentContent ? `Current draft: "${currentContent}"` : 'No current content.'}
${context ? `Additional context: ${context}` : ''}

Return ONLY a JSON array of 3 strings, each being a complete post. No markdown, no explanation.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://thequantumclub.com',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        try {
          suggestions = JSON.parse(content);
        } catch {
          // Try to extract suggestions from text
          suggestions = content.split('\n\n').filter((s: string) => s.trim().length > 20).slice(0, 3);
        }
      }
    }

    // Fallback suggestions if AI fails
    if (suggestions.length === 0) {
      suggestions = [
        "What's one career lesson you wish you'd learned earlier? For me, it's the power of strategic patience—knowing when to push and when to wait has been transformative.",
        "The best opportunities often come from unexpected connections. That coffee chat you're considering? It might lead somewhere extraordinary.",
        "Three things I look for in every role: growth potential, cultural alignment, and impact opportunity. What's on your non-negotiable list?",
      ];
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Post suggestion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

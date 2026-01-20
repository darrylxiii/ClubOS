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

    // Use Lovable AI Gateway (no external API key required)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let suggestions: string[] = [];

    if (LOVABLE_API_KEY) {
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

      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
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
            // Handle JSON wrapped in markdown code blocks
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              suggestions = JSON.parse(jsonMatch[0]);
            } else {
              suggestions = JSON.parse(content);
            }
          } catch {
            // Try to extract suggestions from text
            suggestions = content.split('\n\n').filter((s: string) => s.trim().length > 20).slice(0, 3);
          }
        } else {
          const errorText = await response.text();
          console.error('Lovable AI error:', response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', suggestions: [] }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ error: 'AI credits exhausted. Please add funds.', suggestions: [] }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (aiError) {
        console.error('AI suggestion error:', aiError);
      }
    } else {
      console.log('LOVABLE_API_KEY not configured, using fallback suggestions');
    }

    // Fallback suggestions if AI fails or no API key
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

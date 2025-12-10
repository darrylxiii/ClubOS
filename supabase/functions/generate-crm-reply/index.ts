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
    const { prospectName, prospectCompany, originalEmail, classification, tone = 'professional' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const classificationContext = {
      hot: 'The prospect is very interested and ready to move forward. Be enthusiastic and propose next steps.',
      warm: 'The prospect shows interest but may have questions. Be helpful and address any concerns.',
      objection: 'The prospect has raised an objection. Acknowledge their concern and provide a thoughtful response.',
      not_interested: 'The prospect is not interested. Be gracious and leave the door open for future contact.',
      neutral: 'The prospect response is neutral. Be friendly and try to re-engage with value.'
    };

    const systemPrompt = `You are a professional sales representative for The Quantum Club, an elite recruitment platform. 
Generate a concise, professional email reply based on the prospect's response.

Guidelines:
- Keep replies under 150 words
- Be ${tone} in tone
- ${classificationContext[classification as keyof typeof classificationContext] || classificationContext.neutral}
- Include a clear call-to-action
- Personalize using the prospect's name and company
- Never be pushy or aggressive
- End with a professional sign-off`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Prospect: ${prospectName} from ${prospectCompany}
Classification: ${classification}
Their email:
${originalEmail}

Generate a professional reply:`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to generate reply');
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ reply, classification }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating CRM reply:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

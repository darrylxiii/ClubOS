
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { kpis, domainHealth } = await req.json();

        if (!kpis || !domainHealth) {
            throw new Error('Missing KPI data');
        }

        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
            throw new Error('LOVABLE_API_KEY not configured');
        }

        // summary construction
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

        console.log('Generating KPI Insights...');

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

        if (!response.ok) {
            const errText = await response.text();
            console.error("AI API Error:", errText);
            throw new Error(`AI API Error: ${response.status}`);
        }

        const aiData = await response.json();
        let content = aiData.choices[0].message.content;

        // Simple JSON extraction if wrapped in code blocks
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) content = jsonMatch[0];

        const result = JSON.parse(content);

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error generating insights:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

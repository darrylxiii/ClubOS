
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

        const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
        if (!GOOGLE_API_KEY) {
            throw new Error('GOOGLE_API_KEY not configured');
        }

        // --- CACHE GUARD: Only generate once per hour ---
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentInsight } = await supabase
            .from('ai_generated_content')
            .select('generated_content, created_at')
            .eq('content_type', 'kpi_insights')
            .gte('created_at', oneHourAgo)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (recentInsight) {
            console.log('[KPI Insights] Serving cached result from', recentInsight.created_at);
            try {
                return new Response(recentInsight.generated_content, {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch {
                // Cached content is invalid, regenerate
            }
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

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GOOGLE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gemini-2.5-flash-lite',
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
        const resultJson = JSON.stringify(result);

        // Cache the result for 1 hour
        await supabase.from('ai_generated_content').insert({
            content_type: 'kpi_insights',
            generated_content: resultJson,
            prompt: 'kpi_insights_auto',
        }).then(({ error }) => {
            if (error) console.warn('Failed to cache KPI insights:', error.message);
        });

        return new Response(resultJson, {
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

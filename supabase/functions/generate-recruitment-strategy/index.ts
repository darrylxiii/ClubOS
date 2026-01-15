import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getPromptTemplate, interpolateTemplate } from "../_shared/prompt-loader.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { project_config_id } = await req.json();

        if (!project_config_id) {
            throw new Error('Missing project_config_id');
        }

        // 1. Fetch Project Config
        const { data: config, error: configError } = await supabase
            .from('recruitment_project_configs')
            .select('*')
            .eq('id', project_config_id)
            .single();

        if (configError || !config) {
            throw new Error(`Config not found: ${configError?.message}`);
        }

        console.log(`[Strategy] Generating strategy for Config v${config.version}`);

        // 2. Fetch Prompt
        const promptTemplate = await getPromptTemplate(supabase, 'recruitment.strategy.generator');

        // 3. Prepare Context
        const systemPrompt = interpolateTemplate(promptTemplate.system_prompt, {
            project_config: JSON.stringify(config.config) // The JSON schema
        });

        // 4. Call LLM
        const llmResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: promptTemplate.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: "Generate the search strategies now." }
                ],
                temperature: promptTemplate.temperature,
                response_format: { type: "json_object" }
            })
        });

        if (!llmResp.ok) {
            const err = await llmResp.text();
            console.error('[Strategy] LLM Error:', err);
            throw new Error(`LLM Error: ${err}`);
        }

        const llmData = await llmResp.json();

        let result;
        try {
            result = JSON.parse(llmData.choices[0].message.content);
        } catch (parseError) {
            console.error('[Strategy] Failed to parse LLM response:', llmData.choices[0].message.content);
            throw new Error('Strategy generation returned invalid JSON');
        }

        if (!result.strategies || !Array.isArray(result.strategies)) {
            throw new Error('Invalid LLM output: missing strategies array');
        }

        console.log(`[Strategy] Generated ${result.strategies.length} strategies`);

        // 5. Check for existing strategies to prevent duplicates
        const { data: existingStrategies } = await supabase
            .from('recruitment_search_queue')
            .select('strategy_name, query_payload')
            .eq('project_config_id', project_config_id);

        const existingQueries = new Set(
            existingStrategies?.map(s => s.query_payload?.query?.toLowerCase() || '') || []
        );

        // 6. Save to Search Queue (only new strategies)
        const queueEntries = result.strategies
            .filter((strat: any) => !existingQueries.has(strat.query?.toLowerCase()))
            .map((strat: any) => ({
                project_config_id: project_config_id,
                strategy_name: strat.name,
                query_payload: { query: strat.query, logic: strat.logic },
                platform: strat.platform || 'linkedin',
                status: 'pending',
                priority: 1
            }));

        if (queueEntries.length === 0) {
            return new Response(
                JSON.stringify({
                    message: 'No new strategies to add (duplicates filtered)',
                    strategies: result.strategies
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { error: insertError } = await supabase
            .from('recruitment_search_queue')
            .insert(queueEntries);

        if (insertError) {
            throw insertError;
        }

        return new Response(
            JSON.stringify({
                message: `Strategy generated successfully (${queueEntries.length} new, ${result.strategies.length - queueEntries.length} duplicates skipped)`,
                strategies: result.strategies,
                inserted_count: queueEntries.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Strategy] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

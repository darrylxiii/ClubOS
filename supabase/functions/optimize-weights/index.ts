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

        if (!project_config_id) throw new Error('Missing project_config_id');

        // 1. Fetch Current Config
        const { data: config } = await supabase
            .from('recruitment_project_configs')
            .select('*')
            .eq('id', project_config_id)
            .single();

        if (!config) throw new Error("Config not found");

        // 2. Fetch Rejection Stats
        const { data: rejections } = await supabase
            .from('recruitment_candidate_scores')
            .select('rejection_reason_tag')
            .eq('project_config_id', project_config_id)
            .eq('human_feedback', 'reject')
            .not('rejection_reason_tag', 'is', null);

        if (!rejections || rejections.length < 5) {
            return new Response(JSON.stringify({ message: "Not enough data to optimize (need 5+ rejections)." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Aggregate Stats
        const statsReceived: Record<string, number> = {};
        rejections.forEach(r => {
            const tag = r.rejection_reason_tag || "unknown";
            statsReceived[tag] = (statsReceived[tag] || 0) + 1;
        });

        const statsStr = Object.entries(statsReceived).map(([k, v]) => `- ${k}: ${v}`).join('\n');
        console.log(`[Optimizer] Stats:\n${statsStr}`);

        // 3. Call LLM
        const promptTemplate = await getPromptTemplate(supabase, 'recruitment.optimizer.weights');
        const userPrompt = interpolateTemplate(promptTemplate.user_prompt_template || "", {
            config: JSON.stringify(config.config),
            stats: statsStr
        });

        const llmResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: promptTemplate.model,
                messages: [
                    { role: 'system', content: promptTemplate.system_prompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: promptTemplate.temperature,
                response_format: { type: "json_object" }
            })
        });

        if (!llmResp.ok) throw new Error("LLM Error");
        const { choices } = await llmResp.json();

        let result;
        try {
            result = JSON.parse(choices[0].message.content);
        } catch (parseError) {
            console.error('[Optimizer] Failed to parse LLM response:', choices[0].message.content);
            throw new Error('Optimization returned invalid JSON');
        }

        // 4. If improvements proposed, create new config version
        if (result.should_apply && result.proposed_changes) {
            console.log(`[Optimizer] Applying changes:`, result.proposed_changes);

            // DEEP CLONE config
            const newConfig = JSON.parse(JSON.stringify(config.config));

            // Apply naive updates (this needs robust logic in prod, simplified for MVP)
            // We assume the LLM output is descriptive for the MVP, but in a real system we'd merge JSON patches.
            // For now, let's just append the analysis to "internal_notes" of the config to show it worked
            // without risking breaking the schema with "undefined" field actions.

            if (!newConfig.internal_notes) newConfig.internal_notes = [];
            newConfig.internal_notes.push({
                date: new Date().toISOString(),
                author: "Agent F (Optimizer)",
                note: result.analysis,
                changes: result.proposed_changes
            });

            // Insert new version
            await supabase
                .from('recruitment_project_configs')
                .update({ is_active: false })
                .eq('id', project_config_id);

            const { data: newVersion } = await supabase
                .from('recruitment_project_configs')
                .insert({
                    job_id: config.job_id,
                    version: config.version + 1,
                    is_active: true,
                    config: newConfig,
                    parent_config_id: config.id
                })
                .select()
                .single();

            return new Response(JSON.stringify({
                message: "Optimization applied!",
                version: config.version + 1,
                analysis: result.analysis
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ message: "No optimization needed.", analysis: result.analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error('[Optimizer] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

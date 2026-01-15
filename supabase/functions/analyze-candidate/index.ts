import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
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
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

        if (!lovableApiKey) throw new Error('LOVABLE_API_KEY is not set');

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { candidate_id, project_config_id } = await req.json();

        if (!candidate_id || !project_config_id) throw new Error('candidate_id and project_config_id are required');

        // 1. Fetch Candidate & Config
        const [candidateResult, configResult] = await Promise.all([
            supabase.from('candidate_profiles').select('*').eq('id', candidate_id).single(),
            supabase.from('recruitment_project_configs').select('*').eq('id', project_config_id).single()
        ]);

        if (candidateResult.error) throw new Error(`Candidate fetch error: ${candidateResult.error.message}`);
        if (configResult.error) throw new Error(`Config fetch error: ${configResult.error.message}`);

        const candidate = candidateResult.data;
        const config = configResult.data.config;

        console.log(`[Analyzer] analyzing ${candidate.full_name} against config ${project_config_id}`);

        // ==========================================
        // TIER 1: Rejection Gates (Fast & Cheap)
        // ==========================================
        const gates = config.rejection_gates || [];
        let tier1Verdict = 'pass';
        let failedGate = null;

        if (gates.length > 0) {
            // Fetch Tier 1 prompt from DB (Admin-Editable!)
            const tier1Template = await getPromptTemplate(supabase, 'recruitment.analyzer.tier1');

            const tier1Prompt = interpolateTemplate(tier1Template.system_prompt, {
                candidate: JSON.stringify(candidate).substring(0, 5000),
                gates: JSON.stringify(gates)
            });

            const t1Resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${lovableApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: tier1Template.model,
                    messages: [{ role: 'system', content: tier1Prompt }],
                    temperature: tier1Template.temperature,
                    response_format: { type: "json_object" }
                })
            });

            const t1Data = await t1Resp.json();

            let t1Result;
            try {
                t1Result = JSON.parse(t1Data.choices[0].message.content);
            } catch (parseError) {
                console.error('[Analyzer] Failed to parse Tier 1 response:', t1Data.choices[0].message.content);
                throw new Error('Tier 1 analysis returned invalid JSON');
            }

            if (!t1Result.pass) {
                tier1Verdict = 'reject';
                failedGate = t1Result.failed_gate_reason;
                console.log(`[Analyzer] Candidate REJECTED at Tier 1: ${failedGate} (${t1Result.rejection_tag})`);

                await saveScore(
                    supabase,
                    candidate_id,
                    project_config_id,
                    0,
                    'reject',
                    { reason: failedGate },
                    t1Result.rejection_tag || 'other',
                    failedGate
                );

                return new Response(
                    JSON.stringify({ status: 'rejected', reason: failedGate, tag: t1Result.rejection_tag }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // ==========================================
        // TIER 2: Deep Analysis (Expensive)
        // ==========================================
        // Fetch Tier 2 prompt from DB (Admin-Editable!)
        const tier2Template = await getPromptTemplate(supabase, 'recruitment.analyzer.tier2');

        const tier2Prompt = interpolateTemplate(tier2Template.system_prompt, {
            candidate: JSON.stringify(candidate).substring(0, 10000),
            config: JSON.stringify(config)
        });

        const t2Resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: tier2Template.model,
                messages: [{ role: 'system', content: tier2Prompt }],
                temperature: tier2Template.temperature,
                response_format: { type: "json_object" }
            })
        });

        const t2Data = await t2Resp.json();

        let analysis;
        try {
            analysis = JSON.parse(t2Data.choices[0].message.content);
        } catch (parseError) {
            console.error('[Analyzer] Failed to parse Tier 2 response:', t2Data.choices[0].message.content);
            throw new Error('Tier 2 analysis returned invalid JSON');
        }

        console.log(`[Analyzer] Candidate Scored: ${analysis.total_score}`);

        // Save Result
        await saveScore(supabase, candidate_id, project_config_id, analysis.total_score, 'pass', analysis);

        return new Response(
            JSON.stringify({
                status: 'analyzed',
                score: analysis.total_score,
                analysis
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[Analyzer] Error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

async function saveScore(
    supabase: any,
    candidate_id: string,
    config_id: string,
    score: number,
    t1: string,
    t2: any,
    rejection_tag?: string,
    rejection_note?: string
) {
    const { error } = await supabase
        .from('recruitment_candidate_scores')
        .upsert({
            candidate_id,
            project_config_id: config_id,
            total_score: score,
            tier_1_verdict: t1,
            tier_2_analysis: t2,
            rejection_reason_tag: rejection_tag,
            rejection_note: rejection_note,
            updated_at: new Date().toISOString()
        }, { onConflict: 'candidate_id,project_config_id' });

    if (error) console.error('DB Upsert Error:', error);
}

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getPromptTemplate } from "../_shared/prompt-loader.ts";

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

        const { raw_data_id } = await req.json();

        if (!raw_data_id) throw new Error('Missing raw_data_id');

        // 1. Fetch Raw Data
        const { data: raw, error: rawError } = await supabase
            .from('candidate_raw_data')
            .select('*, recruitment_search_queue(*)') // Get parent queue for config_id
            .eq('id', raw_data_id)
            .single();

        if (rawError || !raw) throw new Error(`Raw data not found: ${rawError?.message}`);

        if (raw.processed) {
            console.log(`[Normalizer] Raw data ${raw_data_id} already processed. Skipping.`);
            return new Response(JSON.stringify({ message: "Already processed" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log(`[Normalizer] Processing raw data: ${raw.source_platform} / ${raw.source_id}`);

        // 2. Fetch Prompt
        const promptTemplate = await getPromptTemplate(supabase, 'recruitment.normalizer.universal');

        // 3. Normalize & Extract DNA via LLM
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
                    { role: 'user', content: JSON.stringify(raw.raw_data).substring(0, 50000) } // Truncate if huge
                ],
                temperature: promptTemplate.temperature,
                response_format: { type: "json_object" }
            })
        });

        if (!llmResp.ok) {
            console.error('[Normalizer] LLM Error:', await llmResp.text());
            throw new Error('LLM normalization failed');
        }

        const { choices } = await llmResp.json();

        let result;
        try {
            result = JSON.parse(choices[0].message.content);
        } catch (parseError) {
            console.error('[Normalizer] Failed to parse LLM response:', choices[0].message.content);
            throw new Error('Normalization returned invalid JSON');
        }

        const { profile, core_dna } = result;

        if (!profile) throw new Error('LLM did not return a profile object');

        // 4. Find Existing Candidate (Deduplication)
        let candidateId: string | null = null;

        // Try LinkedIn URL
        if (profile.linkedin_url || raw.source_id) {
            const urlToSearch = profile.linkedin_url || raw.source_id; // Naive check
            if (urlToSearch.includes('linkedin')) {
                const { data: existing } = await supabase
                    .from('candidate_profiles')
                    .select('id')
                    .eq('linkedin_url', urlToSearch)
                    .maybeSingle();
                if (existing) candidateId = existing.id;
            }
        }

        // Try Email
        if (!candidateId && profile.email) {
            const { data: existing } = await supabase
                .from('candidate_profiles')
                .select('id')
                .eq('email', profile.email)
                .maybeSingle();
            if (existing) candidateId = existing.id;
        }

        // 5. Insert or Update Candidate Profile
        const profileData = {
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email || null,
            linkedin_url: profile.linkedin_url || (raw.source_platform === 'linkedin_mock' ? `https://linkedin.com/in/${raw.source_id}` : null),
            current_title: profile.current_title || (profile.work_experience?.[0]?.title) || null,
            current_company: profile.current_company || (profile.work_experience?.[0]?.company) || null,
            location: profile.location || null,
            bio: profile.bio || profile.summary || null,
            skills: profile.skills || [],
            work_experience: profile.work_experience || [],
            core_dna: core_dna || {}, // ADD-01 field
            updated_at: new Date().toISOString()
        };

        if (candidateId) {
            console.log(`[Normalizer] Updating existing candidate ${candidateId}`);
            await supabase.from('candidate_profiles').update(profileData).eq('id', candidateId);
        } else {
            console.log(`[Normalizer] Creating new candidate`);
            const { data: newCand, error: createError } = await supabase
                .from('candidate_profiles')
                .insert(profileData)
                .select('id')
                .single();

            if (createError) throw createError;
            candidateId = newCand.id;
        }

        // 6. Mark Raw Data as Processed
        await supabase
            .from('candidate_raw_data')
            .update({ processed: true })
            .eq('id', raw_data_id);

        // 7. Trigger Logic: Check Search Queue -> Project Config -> Analyze
        let analysisTriggered = false;
        const queue = raw.recruitment_search_queue;
        if (queue && queue.project_config_id) {
            console.log(`[Normalizer] Triggering Analyzer for Candidate ${candidateId} on Project ${queue.project_config_id}`);

            // Trigger analyze-candidate
            // Fire and forget, or await? Let's await to log result.
            await supabase.functions.invoke('analyze-candidate', {
                body: {
                    candidate_id: candidateId,
                    project_config_id: queue.project_config_id
                }
            });
            analysisTriggered = true;
        }

        return new Response(
            JSON.stringify({
                message: 'Normalized successfully',
                candidate_id: candidateId,
                analysis_triggered: analysisTriggered
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Normalizer] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

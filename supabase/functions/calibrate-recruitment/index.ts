import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { getPromptTemplate, interpolateTemplate } from "../_shared/prompt-loader.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROJECT_CONFIG_SCHEMA = {
    "type": "object",
    "required": ["role_identity", "must_haves", "criteria", "rejection_gates", "client_bias", "strategies"],
    "properties": {
        "role_identity": {
            "type": "object",
            "properties": {
                "title": { "type": "string" },
                "seniority_level": { "type": "string", "enum": ["junior", "mid", "senior", "lead", "staff", "executive"] },
                "department": { "type": "string" },
                "standardized_title": { "type": "string" }
            },
            "required": ["title", "seniority_level"]
        },
        "client_bias": {
            "type": "object",
            "description": "Explicit client preferences and biases to model.",
            "properties": {
                "risk_tolerance": { "type": "string", "enum": ["low", "medium", "high"], "description": "Low = stable backgrounds only." },
                "pedigree_preference": { "type": "string", "enum": ["ignore", "preferred", "required"], "description": "Importance of top schools/companies." },
                "job_hopping_tolerance": { "type": "string", "enum": ["strict", "flexible", "ignore"], "description": "Strict = reject frequent movers." },
                "notes": { "type": "array", "items": { "type": "string" } }
            }
        },
        "must_haves": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Binary hard requirements."
        },
        "criteria": {
            "type": "array",
            "description": " nuanced scoring criteria matching Intent to observable Signals.",
            "items": {
                "type": "object",
                "required": ["intent", "signals", "weight"],
                "properties": {
                    "intent": { "type": "string", "description": "The quality we are looking for (e.g., 'Hunter Mentality')." },
                    "weight": { "type": "number", "description": "Importance 1-10 or percentage." },
                    "signals": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Observable evidence in a profile that proves this intent."
                    }
                }
            }
        },
        "rejection_gates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "condition": { "type": "string", "description": "Natural language condition" },
                    "logic_code": { "type": "string" },
                    "reason": { "type": "string" }
                },
                "required": ["condition"]
            }
        },
        "strategies": {
            "type": "object",
            "properties": {
                "competitors": { "type": "array", "items": { "type": "string" } },
                "target_industries": { "type": "array", "items": { "type": "string" } },
                "boolean_queries": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": { "type": "string" },
                            "query": { "type": "string" },
                            "platform": { "type": "string", "enum": ["linkedin", "google", "github", "other"] }
                        }
                    }
                }
            }
        },
        "anti_patterns": { "type": "array", "items": { "type": "string" } },
        "interview_topics": { "type": "array", "items": { "type": "string" } }
    }
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

        if (!lovableApiKey) {
            throw new Error('LOVABLE_API_KEY is not set');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { job_id, intake_notes, meeting_id, dry_run } = await req.json();

        if (!job_id) {
            throw new Error('Missing job_id');
        }

        // 1. Fetch Job Details
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', job_id)
            .single();

        if (jobError || !job) {
            throw new Error(`Job not found: ${jobError?.message}`);
        }

        // 1b. Fetch Meeting Context (DEEP INTEGRATION)
        let enrichedNotes = intake_notes || "";
        if (meeting_id) {
            console.log(`[Calibration] Fetching context for Meeting ${meeting_id}`);
            const { data: meeting } = await supabase
                .from('meeting_recordings') // or meeting_intelligence view
                .select('ai_summary')
                .eq('meeting_id', meeting_id)
                .maybeSingle();

            if (meeting?.ai_summary) {
                // Assume ai_summary is JSON, extract key parts
                const summaryText = typeof meeting.ai_summary === 'string'
                    ? meeting.ai_summary
                    : JSON.stringify(meeting.ai_summary);

                enrichedNotes += `\n\n[MEETING INTELLIGENCE]:\n${summaryText}`;
            }
        }

        console.log(`[Calibration] Calibrating for job: ${job.title} (${job.id})`);

        // 2. Fetch Prompt Template from Database (Admin-Editable!)
        const promptTemplate = await getPromptTemplate(supabase, 'recruitment.calibration.system');

        // 3. Interpolate Variables
        const systemPrompt = interpolateTemplate(promptTemplate.system_prompt, {
            schema: JSON.stringify(PROJECT_CONFIG_SCHEMA, null, 2)
        });

        const userContent = promptTemplate.user_prompt_template
            ? interpolateTemplate(promptTemplate.user_prompt_template, {
                job_title: job.title,
                job_description: job.description || "No description provided.",
                intake_notes: enrichedNotes || "None"
            })
            : `JOB TITLE: ${job.title}\n\nJOB DESCRIPTION:\n${job.description || "No description provided."}\n\nINTAKE NOTES:\n${enrichedNotes || "None"}`;

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
                    { role: 'user', content: userContent }
                ],
                temperature: promptTemplate.temperature,
                response_format: { type: "json_object" }
            })
        });

        if (!llmResp.ok) {
            const txt = await llmResp.text();
            throw new Error(`LLM call failed: ${txt}`);
        }

        const llmData = await llmResp.json();

        let generatedConfig;
        try {
            generatedConfig = JSON.parse(llmData.choices[0].message.content);
        } catch (parseError) {
            console.error('[Calibration] Failed to parse LLM response:', llmData.choices[0].message.content);
            throw new Error('LLM returned invalid JSON. Please try again.');
        }

        console.log(`[Calibration] Configuration generated successfully.`);

        // 5. Save to Database (if not dry_run)
        let savedConfig = null;
        if (!dry_run) {
            // Get latest version for this job
            const { data: latestVersion } = await supabase
                .from('recruitment_project_configs')
                .select('version')
                .eq('job_id', job_id)
                .order('version', { ascending: false })
                .limit(1)
                .single();

            const newVersion = (latestVersion?.version || 0) + 1;

            // Archive old active configs for this job
            await supabase
                .from('recruitment_project_configs')
                .update({ is_active: false })
                .eq('job_id', job_id)
                .eq('is_active', true);

            // Insert new config
            const { data: inserted, error: insertError } = await supabase
                .from('recruitment_project_configs')
                .insert({
                    job_id: job.id,
                    config: generatedConfig,
                    is_active: true,
                    version: newVersion
                })
                .select()
                .single();

            if (insertError) throw new Error(`DB Insert failed: ${insertError.message}`);
            savedConfig = inserted;
        }

        return new Response(
            JSON.stringify({
                success: true,
                job_title: job.title,
                config: generatedConfig,
                saved_id: savedConfig?.id,
                version: savedConfig?.version,
                is_dry_run: !!dry_run
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[Calibration] Error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

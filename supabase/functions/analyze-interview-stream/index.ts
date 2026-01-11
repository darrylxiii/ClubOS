import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

        if (!lovableApiKey) {
            console.warn('[Sentinel] LOVABLE_API_KEY missing. Returning MOCK response for testing.');
            return new Response(
                JSON.stringify({
                    "status": "safe",
                    "message": "Mock Analysis (Local Test)",
                    "details": "This is a mock response because LOVABLE_API_KEY is missing. Context matches transcript."
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { transcript_chunk, candidate_id, session_id } = await req.json();

        if (!transcript_chunk) {
            return new Response(JSON.stringify({ message: "No text provided" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log(`[Sentinel] Analyzing chunk for Candidate ${candidate_id || 'Unknown'}: "${transcript_chunk.substring(0, 50)}..."`);

        // 1. Fetch Candidate Context (Graph + Profile) for Fact Checking
        let candidateContext = "Candidate context not found.";
        if (candidate_id) {
            // Get basic profile
            const { data: profile } = await supabase
                .from('people')
                .select('first_name, last_name, bio, work_history, skills')
                .eq('id', candidate_id)
                .single();

            if (profile) {
                candidateContext = `Candidate: ${profile.first_name} ${profile.last_name}
Bio: ${profile.bio}
Skills: ${JSON.stringify(profile.skills)}
Work History: ${JSON.stringify(profile.work_history)}`;

                // Get Graph relationships (e.g. "Has Skil: React", "Worked At: Google")
                const { data: relationships } = await supabase
                    .from('entity_relationships')
                    .select('relationship_type, target_id, strength_score')
                    .eq('source_id', candidate_id);

                if (relationships && relationships.length > 0) {
                    candidateContext += `\nKnowledge Graph Facts:\n${relationships.map(r => `- ${r.relationship_type} ${r.target_id} (Score: ${r.strength_score})`).join('\n')}`;
                }
            }
        }

        // 2. AI Analysis (The "Sentinel")
        // Check for lies/inconsistencies OR opportunities to ask deeper questions
        const systemPrompt = `You are an Interview Copilot (Sentinel).
Your goal is to Fact Check the candidate and suggest the next question.

Candidate Context:
${candidateContext}

Current Transcript Chunk:
"${transcript_chunk}"

Task:
1. FACT_CHECK: Does the transcript contradict the known context? (e.g., claimed 5 years React, but context says 1 year).
2. SUGGESTION: Based on what they just said, what is a smart follow-up question?

Return JSON:
{
  "status": "safe" | "alert" | "suggestion",
  "message": "Short message for the recruiter HUD",
  "details": "Longer explanation or specific question to ask"
}`;

        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: systemPrompt }],
                response_format: { type: "json_object" }
            })
        });

        const aiData = await aiResp.json();
        const analysis = JSON.parse(aiData.choices[0].message.content);

        // 3. Save Alert if needed
        if (analysis.status !== 'safe' && session_id) {
            // We append this alert to the session flags
            // Note: In production, we'd use a separate table or array_append, here we just return it for the UI to handle state
            /* 
            await supabase.rpc('append_interview_flag', { 
                session_id, 
                flag: analysis 
            });
            */
            console.log(`[Sentinel] Flagged: ${analysis.status} - ${analysis.message}`);
        }

        return new Response(
            JSON.stringify(analysis),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[Sentinel] Error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

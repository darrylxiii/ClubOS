import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SentinelSchema = z.object({
    transcript_chunk: z.string(),
    candidate_id: z.string().optional(),
    session_id: z.string().optional(),
});

interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleAnalyzeInterviewStream({ supabase, payload }: ActionContext) {
    const { transcript_chunk, candidate_id, session_id } = SentinelSchema.parse(payload);

    if (!transcript_chunk) throw new Error("No text provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    // Mock fallback if missing (matches original logic)
    if (!LOVABLE_API_KEY) {
        return {
            status: "safe",
            message: "Mock Analysis (Local Test)",
            details: "No API KEY. Context matches."
        };
    }

    // 1. Fetch Context
    let candidateContext = "Candidate context not found.";
    if (candidate_id) {
        const { data: profile } = await supabase.from('people').select('first_name, last_name, bio, work_history, skills').eq('id', candidate_id).single();
        if (profile) {
            candidateContext = `Candidate: ${profile.first_name} ${profile.last_name}\nBio: ${profile.bio}\nSkills: ${JSON.stringify(profile.skills)}\nHistory: ${JSON.stringify(profile.work_history)}`;
            const { data: rels } = await supabase.from('entity_relationships').select('*').eq('source_id', candidate_id);
            if (rels?.length) candidateContext += `\nKnowledge Graph: ${rels.map((r: any) => `${r.relationship_type} ${r.target_id}`).join(', ')}`;
        }
    }

    // 2. AI Analysis
    const systemPrompt = `You are an Interview Copilot (Sentinel). Fact Check and Suggest Questions.
Context: ${candidateContext}
Chunk: "${transcript_chunk}"
Task:
1. FACT_CHECK: Contradictions?
2. SUGGESTION: Follow-up question?
Return JSON: { "status": "safe" | "alert" | "suggestion", "message": "short", "details": "long" }`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gpt-4o-mini', // Kept gpt-4o-mini from original
            messages: [{ role: 'system', content: systemPrompt }],
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) throw new Error(`AI API Error: ${response.status}`);
    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    // 3. Save Alert (Log only here, original had commented out RPC)
    if (analysis.status !== 'safe' && session_id) {
        console.log(`[Sentinel] Flagged: ${analysis.status} - ${analysis.message}`);
    }

    return analysis;
}

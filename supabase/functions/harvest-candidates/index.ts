import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MOCK DATA GENERATOR
// In production, this would be replaced by Proxycurl / BrightData calls
function generateMockProfile(query: string) {
    const isTech = query.toLowerCase().includes('engineer') || query.toLowerCase().includes('developer');
    const isSales = query.toLowerCase().includes('sales') || query.toLowerCase().includes('account');
    const role = isTech ? 'Software Engineer' : (isSales ? 'Sales Executive' : 'Professional');

    return {
        public_identifier: `mock-${Math.random().toString(36).substring(7)}`,
        first_name: isTech ? ["Alex", "Sam", "Jordan"][Math.floor(Math.random() * 3)] : ["Chris", "Taylor", "Morgan"][Math.floor(Math.random() * 3)],
        last_name: ["Doe", "Smith", "Johnson", "Lee"][Math.floor(Math.random() * 4)],
        headline: `Senior ${role} at TechCorp | Ex-Startup`,
        summary: `Passion for ${isTech ? 'clean code and distributed systems' : 'closing deals and building relationships'}. 5+ years of experience in high-growth environments.`,
        location: "San Francisco, CA",
        experiences: [
            {
                company: "TechCorp",
                title: `Senior ${role}`,
                starts_at: { day: 1, month: 1, year: 2023 },
                ends_at: null,
                description: `Leading key initiatives in ${isTech ? 'backend infrastructure' : 'enterprise sales'}.`
            },
            {
                company: "StartupInc",
                title: role,
                starts_at: { day: 1, month: 1, year: 2020 },
                ends_at: { day: 31, month: 12, year: 2022 },
                description: "Wore many hats, helped scale from 0 to 1."
            }
        ],
        skills: isTech ? ["TypeScript", "React", "Node.js", "PostgreSQL"] : ["Salesforce", "Cold Calling", "Negotiation", "CRM"]
    };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        let { queue_id } = await req.json();

        if (!queue_id) {
            // Auto-pick mode: find pending items
            const { data: pending, error } = await supabase
                .from('recruitment_search_queue')
                .select('id, query_payload')
                .eq('status', 'pending')
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (!pending) return new Response(JSON.stringify({ message: "No pending tasks" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

            // Process this item directly instead of recursive fetch
            queue_id = pending.id;
        }

        console.log(`[Harvester] Processing Queue ID: ${queue_id}`);

        // 1. Mark as Processing
        await supabase
            .from('recruitment_search_queue')
            .update({ status: 'processing', processed_at: new Date().toISOString() })
            .eq('id', queue_id);

        // 2. Fetch Query Details
        const { data: task } = await supabase
            .from('recruitment_search_queue')
            .select('*')
            .eq('id', queue_id)
            .single();

        if (!task) throw new Error("Task not found");

        // 3. EXECUTE MOCK SEARCH
        // Simulating finding 3 candidates per query for the MVP
        const mockCandidates = [
            generateMockProfile(task.query_payload?.query || ""),
            generateMockProfile(task.query_payload?.query || ""),
            generateMockProfile(task.query_payload?.query || "")
        ];

        console.log(`[Harvester] Found ${mockCandidates.length} profiles (MOCK)`);

        // 4. Save Raw Data
        const rawInserts = mockCandidates.map(c => ({
            source_platform: 'linkedin_mock',
            source_id: c.public_identifier,
            raw_data: c, // Storing the whole JSON
            search_queue_id: queue_id,
            processed: false
        }));

        const { data: insertedRaw, error: rawError } = await supabase
            .from('candidate_raw_data')
            .insert(rawInserts)
            .select('id');

        if (rawError) throw rawError;

        // 5. Trigger Normalization for each found candidate
        const normalizationPromises = insertedRaw.map(raw =>
            supabase.functions.invoke('normalize-candidate', {
                body: { raw_data_id: raw.id }
            })
        );

        // We don't await normalization to complete, we just trigger it (fire and forget pattern, or await if we want strict seq)
        // For stability, let's await them but catch errors so one failure doesn't stop the batch.
        await Promise.allSettled(normalizationPromises);

        // 6. Complete Task
        await supabase
            .from('recruitment_search_queue')
            .update({
                status: 'completed',
                result_count: mockCandidates.length
            })
            .eq('id', queue_id);

        return new Response(
            JSON.stringify({
                message: 'Harvest complete',
                count: mockCandidates.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Harvester] Error:', error);

        // Attempt to mark task as failed if we have queue_id
        try {
            const body = await req.clone().json().catch(() => ({}));
            if (body.queue_id) {
                await supabase
                    .from('recruitment_search_queue')
                    .update({ status: 'failed', error_log: error.message })
                    .eq('id', body.queue_id);
            }
        } catch (e) {
            console.error('[Harvester] Could not mark task as failed:', e);
        }

        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Service role for public token access
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { action, token, candidate_id, status, comment } = await req.json();

        // 1. GET PRESENTATION DATA (Public View)
        if (action === 'get') {
            if (!token) throw new Error('Missing token');

            // Fetch presentation details
            const { data: presentation, error: presError } = await supabase
                .from('recruitment_presentations')
                .select('*, job:jobs(title, company_id)')
                .eq('access_token', token)
                .eq('status', 'active')
                .gt('expires_at', new Date().toISOString())
                .single();

            if (presError || !presentation) {
                return new Response(JSON.stringify({ error: 'Presentation not found or expired' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // Fetch Shortlisted Candidates for this Job
            // We get approved candidates from the recruitment_candidate_scores linked to the Job's active config
            const { data: config } = await supabase
                .from('recruitment_project_configs')
                .select('id')
                .eq('job_id', presentation.job_id)
                .eq('is_active', true)
                .single();

            if (!config) throw new Error('Configuration not found');

            const { data: scores } = await supabase
                .from('recruitment_candidate_scores')
                .select(`
                    total_score,
                    tier_2_analysis,
                    candidate:candidate_profiles(*)
                `)
                .eq('project_config_id', config.id)
                .in('human_feedback', ['approve', 'interview']);
            // We show approved candidates.

            // Process candidates based on 'is_blind'
            const candidates = (scores || []).map((s: any) => {
                const c = s.candidate;
                if (presentation.is_blind) {
                    return {
                        id: c.id,
                        first_name: 'Candidate', // Masked
                        last_name: c.id.substring(0, 4), // Masked with ID fragment
                        headline: c.headline,
                        bio: c.bio,
                        skills: c.skills,
                        location: c.location,
                        total_score: s.total_score,
                        analysis: s.tier_2_analysis,
                        is_blind: true
                        // Omit email, phone, linkedin
                    };
                } else {
                    return {
                        ...c,
                        total_score: s.total_score,
                        analysis: s.tier_2_analysis
                    };
                }
            });

            return new Response(
                JSON.stringify({
                    job_title: presentation.job.title,
                    is_blind: presentation.is_blind,
                    candidates: candidates
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. SUBMIT FEEDBACK (Public Action)
        if (action === 'vote') {
            if (!token || !candidate_id || !status) throw new Error('Missing vote params');

            // Validate Token first
            const { data: presentation } = await supabase
                .from('recruitment_presentations')
                .select('id')
                .eq('access_token', token)
                .single();

            if (!presentation) throw new Error('Invalid token');

            const { error } = await supabase
                .from('recruitment_presentation_feedback')
                .insert({
                    presentation_id: presentation.id,
                    candidate_id: candidate_id,
                    status: status,
                    client_comment: comment
                });

            if (error) throw error;

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        throw new Error('Invalid action');

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

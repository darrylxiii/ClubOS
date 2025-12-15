
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log("Starting Dynamic Win Probability Prediction...");

        // 1. Fetch Learned Weights (The "Brain")
        const { data: weightsData, error: weightsError } = await supabaseClient
            .from('ml_feature_weights')
            .select('feature_name, weight_score');

        if (weightsError) throw weightsError;

        // Convert array to map for easy lookup
        const weights: Record<string, number> = {};
        weightsData.forEach(w => { weights[w.feature_name] = w.weight_score });

        // Defaults if missing
        const getWeight = (key: string, defaultVal: number) =>
            (weights[key] !== undefined ? Number(weights[key]) : defaultVal);

        // 2. Fetch Active Prospects
        const { data: prospects, error } = await supabaseClient
            .from('crm_prospects')
            .select('id, stage, last_action, created_at, verified_email, velocity_score')
            .not('stage', 'in', '("won","lost","closed_lost")')
            .limit(100);

        if (error) throw error;

        const updates = [];

        for (const prospect of prospects) {
            let score = getWeight('base_bias', 20);

            // Feature 1: Email
            if (prospect.verified_email) score += getWeight('verified_email', 10);

            // Feature 2: Velocity (Using learned multiplier OR heuristic buckets if buckets exist)
            // Here we use the heuristic buckets mapped to weights for simplicity, 
            // but multiplied by the "velocity_score_multiplier" if it exists.

            const lastAction = new Date(prospect.last_action || prospect.created_at);
            const hoursDelta = (new Date().getTime() - lastAction.getTime()) / (1000 * 60 * 60);

            // Apply Time Decay
            if (hoursDelta < 24) score += getWeight('velocity_hot', 30);
            else if (hoursDelta < 72) score += getWeight('velocity_warm', 10);
            else if (hoursDelta > 168) score += getWeight('velocity_stagnant', -20);

            // Feature 3: Explicit Velocity Score (if available and trained)
            if (prospect.velocity_score && weights['velocity_score_multiplier']) {
                // e.g. score 5 * multiplier 2 = +10 pts
                score += (prospect.velocity_score * weights['velocity_score_multiplier']);
            }

            // Feature 4: Stage
            if (prospect.stage === 'meeting_booked') score += getWeight('meeting_booked', 40);

            // Clamp
            score = Math.max(1, Math.min(99, score));

            updates.push({
                id: prospect.id,
                predicted_win_probability: Math.round(score),
                velocity_score: prospect.velocity_score || 0
            });
        }

        // 3. Bulk Update
        if (updates.length > 0) {
            const { error: updateError } = await supabaseClient
                .from('crm_prospects')
                .upsert(updates, { onConflict: 'id' });

            if (updateError) throw updateError;
        }

        return new Response(
            JSON.stringify({
                message: 'Predictions updated dynamically',
                processed: updates.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error predicting win rates:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

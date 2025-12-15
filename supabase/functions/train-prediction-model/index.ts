
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

        console.log("Starting Model Training (Teacher)...");

        // 1. Fetch Training Data (Last 90 Days)
        const { data: deals, error } = await supabaseClient
            .from('crm_prospects')
            .select('id, stage, velocity_score, verified_email, created_at')
            .in('stage', ['won', 'lost', 'closed_lost'])
            .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        if (error) throw error;

        if (deals.length < 10) {
            return new Response(
                JSON.stringify({ message: "Not enough data to train", count: deals.length }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const wonDeals = deals.filter(d => d.stage === 'won');

        // 2. Feature Analysis: Velocity
        // Calculate avg velocity for Won vs Lost
        const avgVelocityWon = wonDeals.reduce((acc, d) => acc + (d.velocity_score || 0), 0) / wonDeals.length || 0;
        const avgVelocityAll = deals.reduce((acc, d) => acc + (d.velocity_score || 0), 0) / deals.length || 0;

        // Simple Learning Rule: If Won velocity > Avg velocity, increase weight
        // Multiplier: How much more velocity do winners have?
        const velocityMultiplier = avgVelocityWon > 0 ? (avgVelocityWon / avgVelocityAll) : 1;

        let newVelocityWeight = 10; // Default
        if (velocityMultiplier > 1.2) newVelocityWeight = 12; // +20%
        if (velocityMultiplier > 1.5) newVelocityWeight = 15; // +50%
        if (velocityMultiplier > 2.0) newVelocityWeight = 20; // +100%

        // 3. Update Weights (The "Learning")
        const updates = [
            {
                feature_name: 'velocity_score_multiplier',
                weight_score: newVelocityWeight,
                metadata: {
                    learned_from: `${deals.length} deals`,
                    insight: `Winners are ${velocityMultiplier.toFixed(1)}x faster`
                }
            }
            // Can add more rules here (Source, Industry, etc.)
        ];

        const { error: upsertError } = await supabaseClient
            .from('ml_feature_weights')
            .upsert(updates, { onConflict: 'feature_name' });

        if (upsertError) throw upsertError;

        console.log("Model Updated:", updates);

        return new Response(
            JSON.stringify({
                message: 'Model training complete',
                insights: updates
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error training model:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

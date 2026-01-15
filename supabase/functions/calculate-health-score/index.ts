import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Optional: Calculate for specific prospect or ALL
        const { prospect_id } = await req.json().catch(() => ({}))

        let query = supabaseClient.from('crm_prospects').select('id, health_score, last_interaction_at')

        if (prospect_id) {
            query = query.eq('id', prospect_id)
        } else {
            // If batch processing, maybe limit or paginate. For now, let's process top 50 recently active?
            // Or just simple all for prototype
            query = query.limit(100)
        }

        const { data: prospects, error: fetchError } = await query

        if (fetchError || !prospects) throw fetchError

        const updates = []

        for (const prospect of prospects) {
            // 1. Fetch Activities
            // We assume 'activity_feed' or similar table logs interactions. 
            // For this prototype, we'll check 'activity_timeline' or 'activity_feed' linked to user/prospect.
            // Wait, the schema for activity linked to prospect might be different.
            // Let's assume we query 'activity_feed' where 'event_data->>prospect_id' equals prospect.id
            // OR better, checking 'last_interaction_at' vs now.

            // Let's implement a simplified algorithm based on metadata available + recent activities
            // Ideally we JOIN activity table. 

            const { data: activities } = await supabaseClient
                .from('activity_feed')
                .select('*')
                .eq('event_data->>prospect_id', prospect.id)
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
                .order('created_at', { ascending: false })

            // Calculate Score
            let score = 50; // Base
            let trend = 'stable';

            // Rules
            const now = new Date();
            const lastInteraction = prospect.last_interaction_at ? new Date(prospect.last_interaction_at) : null;
            const daysSinceInteraction = lastInteraction ? Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 3600 * 24)) : 999;

            // Activity Scoring
            if (activities) {
                activities.forEach(act => {
                    if (act.event_type === 'meeting_booked') score += 30;
                    if (act.event_type === 'email_reply') score += 15;
                    if (act.event_type === 'email_open') score += 1;
                    if (act.event_type === 'linkedin_message') score += 5;
                });
            }

            // Decay
            if (daysSinceInteraction > 14) score -= 10;
            if (daysSinceInteraction > 30) score -= 20;

            // Cap
            score = Math.max(0, Math.min(100, score));

            // Trend
            if (score > (prospect.health_score || 50)) trend = 'improving';
            else if (score < (prospect.health_score || 50)) trend = 'declining';

            updates.push({
                id: prospect.id,
                health_score: score,
                health_trend: trend
            })
        }

        // Bulk Upsert
        if (updates.length > 0) {
            const { error: updateError } = await supabaseClient
                .from('crm_prospects')
                .upsert(updates)

            if (updateError) throw updateError
        }

        return new Response(
            JSON.stringify({ success: true, processed: updates.length, updates }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

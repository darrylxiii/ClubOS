
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

        console.log("Starting KPI Calculation (Source: crm_prospects)...");

        // 1. Calculate Sales KPIs (from crm_prospects acting as Deals)
        // -----------------------

        // A. Total Revenue (Won Prospects)
        const { data: wonProspects, error: wonError } = await supabaseClient
            .from('crm_prospects')
            .select('deal_value, stage')
            .eq('stage', 'won');

        if (wonError) throw wonError;

        const totalRevenue = wonProspects.reduce((sum, p) => sum + (p.deal_value || 0), 0);

        // Insert 'total_revenue' KPI
        await supabaseClient.from('sales_kpi_metrics').insert({
            category: 'closing',
            kpi_name: 'total_revenue',
            value: totalRevenue,
            period_type: 'daily',
            calculated_at: new Date().toISOString()
        });

        // B. Win Rate
        // Count total closed prospects (won + lost)
        const { count: closedCount, error: closedError } = await supabaseClient
            .from('crm_prospects')
            .select('*', { count: 'exact', head: true })
            .in('stage', ['won', 'lost']);

        if (closedError) throw closedError;

        const winRate = closedCount ? ((wonProspects.length / closedCount) * 100) : 0;

        // Insert 'win_rate' KPI
        await supabaseClient.from('sales_kpi_metrics').insert({
            category: 'closing',
            kpi_name: 'win_rate',
            value: winRate,
            period_type: 'daily',
            calculated_at: new Date().toISOString()
        });

        console.log(`KPIs Calculated: Revenue=$${totalRevenue}, WinRate=${winRate}%`);

        return new Response(
            JSON.stringify({
                message: 'KPIs calculated successfully',
                metrics: { totalRevenue, winRate }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error calculating KPIs:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: unknown) => {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
    console.log(`[CALCULATE-KPIS] ${step}${detailsStr}`);
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        logStep("Starting comprehensive KPI Calculation...");

        const now = new Date();
        const periodStart = new Date(now);
        periodStart.setDate(now.getDate() - 30); // Last 30 days

        const metrics: Array<{
            category: string;
            kpi_name: string;
            value: number;
            period_type: string;
            calculated_at: string;
        }> = [];

        // =========================================
        // 1. CRM/PROSPECT KPIs (from crm_prospects)
        // =========================================
        logStep("Calculating CRM KPIs...");

        // Total Revenue (Won Prospects)
        const { data: wonProspects, error: wonError } = await supabaseClient
            .from('crm_prospects')
            .select('deal_value, stage')
            .eq('stage', 'won');

        if (wonError) {
            logStep("Error fetching won prospects", { error: wonError.message });
        }

        const totalRevenue = wonProspects?.reduce((sum, p) => sum + (p.deal_value || 0), 0) || 0;

        metrics.push({
            category: 'closing',
            kpi_name: 'total_revenue',
            value: totalRevenue,
            period_type: 'daily',
            calculated_at: now.toISOString()
        });

        // Win Rate
        const { count: closedCount, error: closedError } = await supabaseClient
            .from('crm_prospects')
            .select('*', { count: 'exact', head: true })
            .in('stage', ['won', 'lost']);

        if (closedError) {
            logStep("Error fetching closed prospects", { error: closedError.message });
        }

        const wonCount = wonProspects?.length || 0;
        const winRate = closedCount ? ((wonCount / closedCount) * 100) : 0;

        metrics.push({
            category: 'closing',
            kpi_name: 'win_rate',
            value: Math.round(winRate * 10) / 10,
            period_type: 'daily',
            calculated_at: now.toISOString()
        });

        // Pipeline Value (prospects not yet won/lost)
        const { data: pipelineProspects, error: pipelineError } = await supabaseClient
            .from('crm_prospects')
            .select('deal_value, stage')
            .not('stage', 'in', '("won","lost")');

        if (pipelineError) {
            logStep("Error fetching pipeline prospects", { error: pipelineError.message });
        }

        const pipelineValue = pipelineProspects?.reduce((sum, p) => sum + (p.deal_value || 0), 0) || 0;

        metrics.push({
            category: 'pipeline',
            kpi_name: 'pipeline_value',
            value: pipelineValue,
            period_type: 'daily',
            calculated_at: now.toISOString()
        });

        // Active Prospects Count
        const activeProspectsCount = pipelineProspects?.length || 0;

        metrics.push({
            category: 'pipeline',
            kpi_name: 'active_prospects',
            value: activeProspectsCount,
            period_type: 'daily',
            calculated_at: now.toISOString()
        });

        // =========================================
        // 2. RECRUITMENT KPIs (from jobs & applications)
        // =========================================
        logStep("Calculating Recruitment KPIs...");

        // Active Jobs
        const { count: activeJobsCount } = await supabaseClient
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published');

        metrics.push({
            category: 'recruitment',
            kpi_name: 'active_jobs',
            value: activeJobsCount || 0,
            period_type: 'daily',
            calculated_at: now.toISOString()
        });

        // Applications This Period
        const { count: applicationsCount } = await supabaseClient
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', periodStart.toISOString());

        metrics.push({
            category: 'recruitment',
            kpi_name: 'applications_received',
            value: applicationsCount || 0,
            period_type: 'monthly',
            calculated_at: now.toISOString()
        });

        // Placements (hired)
        const { count: placementsCount } = await supabaseClient
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'hired')
            .gte('updated_at', periodStart.toISOString());

        metrics.push({
            category: 'recruitment',
            kpi_name: 'placements_made',
            value: placementsCount || 0,
            period_type: 'monthly',
            calculated_at: now.toISOString()
        });

        // Application to Hire Rate
        const hireRate = applicationsCount ? ((placementsCount || 0) / applicationsCount * 100) : 0;

        metrics.push({
            category: 'recruitment',
            kpi_name: 'application_to_hire_rate',
            value: Math.round(hireRate * 10) / 10,
            period_type: 'monthly',
            calculated_at: now.toISOString()
        });

        // =========================================
        // 3. MEETING KPIs
        // =========================================
        logStep("Calculating Meeting KPIs...");

        const { count: totalMeetings } = await supabaseClient
            .from('meetings')
            .select('*', { count: 'exact', head: true })
            .gte('scheduled_start', periodStart.toISOString());

        metrics.push({
            category: 'operations',
            kpi_name: 'meetings_scheduled',
            value: totalMeetings || 0,
            period_type: 'monthly',
            calculated_at: now.toISOString()
        });

        const { count: completedMeetings } = await supabaseClient
            .from('meetings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed')
            .gte('scheduled_start', periodStart.toISOString());

        metrics.push({
            category: 'operations',
            kpi_name: 'meetings_completed',
            value: completedMeetings || 0,
            period_type: 'monthly',
            calculated_at: now.toISOString()
        });

        // =========================================
        // 4. PLACEMENT FEE KPIs
        // =========================================
        logStep("Calculating Placement Fee KPIs...");

        const { data: placementFees } = await supabaseClient
            .from('placement_fees')
            .select('fee_amount, status')
            .gte('created_at', periodStart.toISOString());

        const paidFees = placementFees?.filter(f => f.status === 'paid') || [];
        const totalPlacementRevenue = paidFees.reduce((sum, f) => sum + (f.fee_amount || 0), 0);

        metrics.push({
            category: 'financial',
            kpi_name: 'placement_fee_revenue',
            value: totalPlacementRevenue,
            period_type: 'monthly',
            calculated_at: now.toISOString()
        });

        const avgFeeValue = paidFees.length > 0 ? totalPlacementRevenue / paidFees.length : 0;

        metrics.push({
            category: 'financial',
            kpi_name: 'avg_placement_fee',
            value: Math.round(avgFeeValue),
            period_type: 'monthly',
            calculated_at: now.toISOString()
        });

        // =========================================
        // STORE ALL METRICS
        // =========================================
        logStep(`Storing ${metrics.length} KPI metrics...`);

        // Insert into sales_kpi_metrics (upsert by kpi_name)
        for (const metric of metrics) {
            const { error: insertError } = await supabaseClient
                .from('sales_kpi_metrics')
                .upsert({
                    category: metric.category,
                    kpi_name: metric.kpi_name,
                    value: metric.value,
                    period_type: metric.period_type,
                    calculated_at: metric.calculated_at,
                    updated_at: now.toISOString()
                }, { 
                    onConflict: 'kpi_name',
                    ignoreDuplicates: false 
                });

            if (insertError) {
                logStep(`Error upserting ${metric.kpi_name}`, { error: insertError.message });
            }
        }

        logStep(`KPIs Calculated Successfully`, { 
            count: metrics.length,
            revenue: totalRevenue,
            winRate,
            pipelineValue,
            activeProspects: activeProspectsCount
        });

        return new Response(
            JSON.stringify({
                message: 'KPIs calculated successfully',
                metricsCount: metrics.length,
                metrics: {
                    totalRevenue,
                    winRate,
                    pipelineValue,
                    activeProspects: activeProspectsCount,
                    activeJobs: activeJobsCount,
                    applications: applicationsCount,
                    placements: placementsCount,
                    placementRevenue: totalPlacementRevenue
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logStep('ERROR calculating KPIs', { error: errorMessage });
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
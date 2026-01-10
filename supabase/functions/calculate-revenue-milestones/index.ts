import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MilestoneUpdate {
  id: string;
  previousStatus: string;
  newStatus: string;
  progress: number;
  achievedRevenue: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🎯 Starting Revenue Milestone Calculation...');

    // 1. Get current financial data from Moneybird metrics
    const { data: financialMetrics, error: metricsError } = await supabase
      .from('moneybird_financial_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (metricsError && metricsError.code !== 'PGRST116') {
      console.error('Error fetching financial metrics:', metricsError);
    }

    // Get YTD revenue from placement fees
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    
    const { data: ytdPlacements, error: placementError } = await supabase
      .from('placement_fees')
      .select('fee_amount, cash_flow_status')
      .gte('placement_date', yearStart);

    if (placementError) {
      console.error('Error fetching placements:', placementError);
    }

    // Calculate collected revenue (only paid placements)
    const collectedRevenue = ytdPlacements
      ?.filter(p => p.cash_flow_status === 'collected')
      .reduce((sum, p) => sum + (parseFloat(p.fee_amount) || 0), 0) || 0;

    // Calculate booked revenue (all placements)
    const bookedRevenue = ytdPlacements
      ?.reduce((sum, p) => sum + (parseFloat(p.fee_amount) || 0), 0) || 0;

    // Get lifetime revenue for cumulative track
    const { data: lifetimePlacements, error: lifetimeError } = await supabase
      .from('placement_fees')
      .select('fee_amount, cash_flow_status');

    const lifetimeCollected = lifetimePlacements
      ?.filter(p => p.cash_flow_status === 'collected')
      .reduce((sum, p) => sum + (parseFloat(p.fee_amount) || 0), 0) || 0;

    const lifetimeBooked = lifetimePlacements
      ?.reduce((sum, p) => sum + (parseFloat(p.fee_amount) || 0), 0) || 0;

    console.log(`📊 YTD Revenue - Collected: €${collectedRevenue}, Booked: €${bookedRevenue}`);
    console.log(`📊 Lifetime Revenue - Collected: €${lifetimeCollected}, Booked: €${lifetimeBooked}`);

    // 2. Get all active ladders with their milestones
    const { data: ladders, error: ladderError } = await supabase
      .from('revenue_ladders')
      .select(`
        id,
        track_type,
        revenue_definition,
        revenue_milestones (
          id,
          threshold_amount,
          display_name,
          status,
          progress_percentage,
          achieved_revenue,
          fiscal_year
        )
      `)
      .eq('is_active', true);

    if (ladderError) {
      throw new Error(`Failed to fetch ladders: ${ladderError.message}`);
    }

    const updates: MilestoneUpdate[] = [];
    const unlocks: string[] = [];

    // 3. Process each ladder
    for (const ladder of ladders || []) {
      const isAnnual = ladder.track_type === 'annual';
      const useCollected = ladder.revenue_definition === 'collected';
      
      // Determine which revenue figure to use
      let currentRevenue: number;
      if (isAnnual) {
        currentRevenue = useCollected ? collectedRevenue : bookedRevenue;
      } else {
        currentRevenue = useCollected ? lifetimeCollected : lifetimeBooked;
      }

      // Process each milestone in this ladder
      for (const milestone of ladder.revenue_milestones || []) {
        const threshold = parseFloat(milestone.threshold_amount);
        const progress = Math.min((currentRevenue / threshold) * 100, 100);
        
        let newStatus = milestone.status;
        
        // Determine new status based on progress
        if (currentRevenue >= threshold && milestone.status !== 'rewarded') {
          newStatus = 'unlocked';
        } else if (progress >= 90 && milestone.status === 'locked') {
          newStatus = 'approaching';
        }

        // Only update if something changed
        if (
          newStatus !== milestone.status ||
          Math.abs(progress - (milestone.progress_percentage || 0)) > 0.1 ||
          Math.abs(currentRevenue - (milestone.achieved_revenue || 0)) > 1
        ) {
          const { error: updateError } = await supabase
            .from('revenue_milestones')
            .update({
              status: newStatus,
              progress_percentage: progress,
              achieved_revenue: currentRevenue,
              fiscal_year: isAnnual ? currentYear : null,
              unlocked_at: newStatus === 'unlocked' && milestone.status !== 'unlocked' 
                ? new Date().toISOString() 
                : milestone.status === 'unlocked' ? undefined : null
            })
            .eq('id', milestone.id);

          if (updateError) {
            console.error(`Failed to update milestone ${milestone.id}:`, updateError);
          } else {
            updates.push({
              id: milestone.id,
              previousStatus: milestone.status,
              newStatus,
              progress,
              achievedRevenue: currentRevenue
            });

            // Track unlocks for celebration events
            if (newStatus === 'unlocked' && milestone.status !== 'unlocked') {
              unlocks.push(milestone.id);
              
              // Create celebration record
              await supabase
                .from('milestone_celebrations')
                .insert({
                  milestone_id: milestone.id,
                  celebration_type: 'unlock',
                  celebration_data: {
                    previous_status: milestone.status,
                    achieved_revenue: currentRevenue,
                    threshold: threshold
                  }
                });

              // Log to agent events for notification system
              await supabase
                .from('agent_events')
                .insert({
                  event_type: 'milestone.unlocked',
                  event_source: 'revenue-ladder',
                  entity_type: 'revenue_milestone',
                  entity_id: milestone.id,
                  event_data: {
                    milestone_name: milestone.display_name,
                    achieved_revenue: currentRevenue,
                    threshold: threshold,
                    ladder_type: ladder.track_type
                  },
                  priority: 10
                });

              console.log(`🎉 MILESTONE UNLOCKED: ${milestone.display_name}`);
            }
          }
        }
      }
    }

    // 4. Update contribution attribution (simplified - attribute to recent placements)
    if (unlocks.length > 0) {
      // Get recent placements with user attribution
      const { data: recentPlacements } = await supabase
        .from('placement_fees')
        .select('id, fee_amount, owner_id, placement_date')
        .gte('placement_date', yearStart)
        .not('owner_id', 'is', null);

      for (const milestoneId of unlocks) {
        for (const placement of recentPlacements || []) {
          if (placement.owner_id) {
            await supabase
              .from('milestone_contributions')
              .insert({
                user_id: placement.owner_id,
                milestone_id: milestoneId,
                contribution_type: 'placement',
                revenue_attributed: parseFloat(placement.fee_amount) || 0,
                source_entity_type: 'placement_fee',
                source_entity_id: placement.id
              });
          }
        }
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      revenue: {
        ytd: { collected: collectedRevenue, booked: bookedRevenue },
        lifetime: { collected: lifetimeCollected, booked: lifetimeBooked }
      },
      updates: updates.length,
      unlocks: unlocks.length,
      details: updates
    };

    console.log(`✅ Milestone calculation complete: ${updates.length} updates, ${unlocks.length} unlocks`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in calculate-revenue-milestones:', error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

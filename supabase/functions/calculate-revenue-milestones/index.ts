import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

interface MilestoneUpdate {
  id: string;
  previousStatus: string;
  newStatus: string;
  progress: number;
  achievedRevenue: number;
}

interface PlacementFee {
  id: string;
  fee_amount: string;
  sourced_by: string | null;
  closed_by: string | null;
  added_by: string | null;
  hired_date: string;
  cash_flow_status: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: publicCorsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🎯 Starting Revenue Milestone Calculation...');

    // 1. Get Moneybird lifetime revenue (source of truth for historical data)
    const { data: moneybirdMetrics, error: moneybirdError } = await supabase
      .from('moneybird_financial_metrics')
      .select('year, total_revenue, total_invoiced')
      .order('year', { ascending: true });

    if (moneybirdError && moneybirdError.code !== 'PGRST116') {
      console.error('Error fetching Moneybird metrics:', moneybirdError);
    }

    // Calculate Moneybird lifetime revenue (net, VAT-exclusive - already fixed in sync)
    const moneybirdLifetime = (moneybirdMetrics || [])
      .reduce((sum, m) => sum + (parseFloat(m.total_revenue) || 0), 0);

    console.log(`📊 Moneybird Lifetime Revenue: €${moneybirdLifetime.toLocaleString()}`);

    // 2. Get YTD revenue from placement fees
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    
    const { data: ytdPlacements, error: placementError } = await supabase
      .from('placement_fees')
      .select('id, fee_amount, cash_flow_status, sourced_by, closed_by, added_by, hired_date')
      .gte('hired_date', yearStart) as { data: PlacementFee[] | null; error: any };

    if (placementError) {
      console.error('Error fetching placements:', placementError);
    }

    // Calculate collected revenue (only paid placements)
    const collectedRevenue = (ytdPlacements || [])
      .filter(p => p.cash_flow_status === 'collected')
      .reduce((sum, p) => sum + (parseFloat(p.fee_amount) || 0), 0);

    // Calculate booked revenue (all placements)
    const bookedRevenue = (ytdPlacements || [])
      .reduce((sum, p) => sum + (parseFloat(p.fee_amount) || 0), 0);

    // 3. Get lifetime placements for cumulative track
    const { data: lifetimePlacements, error: lifetimeError } = await supabase
      .from('placement_fees')
      .select('id, fee_amount, cash_flow_status, sourced_by, closed_by, added_by, hired_date') as { data: PlacementFee[] | null; error: any };

    const lifetimeCollected = (lifetimePlacements || [])
      .filter(p => p.cash_flow_status === 'collected')
      .reduce((sum, p) => sum + (parseFloat(p.fee_amount) || 0), 0);

    const lifetimeBooked = (lifetimePlacements || [])
      .reduce((sum, p) => sum + (parseFloat(p.fee_amount) || 0), 0);

    // For lifetime track: use higher of Moneybird or OS data (avoid double counting)
    // Moneybird is source of truth for invoiced, OS for booked-but-not-yet-invoiced
    const combinedLifetime = Math.max(moneybirdLifetime, lifetimeBooked);

    console.log(`📊 YTD Revenue - Collected: €${collectedRevenue}, Booked: €${bookedRevenue}`);
    console.log(`📊 Lifetime Revenue - OS: €${lifetimeBooked}, Combined: €${combinedLifetime}`);

    // 4. Get weighted pipeline for projections
    const { data: pipelineData, error: pipelineError } = await supabase
      .rpc('calculate_weighted_pipeline');

    const weightedPipeline = pipelineData?.weighted_pipeline || 0;
    console.log(`📊 Weighted Pipeline: €${weightedPipeline}`);

    // 5. Get all active ladders with their milestones
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
          fiscal_year,
          projected_unlock_date,
          pipeline_boost,
          last_notification_sent_at
        )
      `)
      .eq('is_active', true);

    if (ladderError) {
      throw new Error(`Failed to fetch ladders: ${ladderError.message}`);
    }

    const updates: MilestoneUpdate[] = [];
    const unlocks: string[] = [];
    const approaching: string[] = [];

    // 6. Process each ladder
    for (const ladder of ladders || []) {
      const isAnnual = ladder.track_type === 'annual';
      const useCollected = ladder.revenue_definition === 'collected';
      
      // Determine which revenue figure to use
      let currentRevenue: number;
      if (isAnnual) {
        currentRevenue = useCollected ? collectedRevenue : bookedRevenue;
      } else {
        currentRevenue = useCollected ? lifetimeCollected : combinedLifetime;
      }

      // Process each milestone in this ladder
      for (const milestone of ladder.revenue_milestones || []) {
        const threshold = parseFloat(milestone.threshold_amount);
        const progress = Math.min((currentRevenue / threshold) * 100, 100);
        const projectedTotal = currentRevenue + weightedPipeline;
        
        let newStatus = milestone.status;
        let projectedUnlockDate: string | null = null;
        
        // Determine new status based on progress
        if (currentRevenue >= threshold && milestone.status !== 'rewarded') {
          newStatus = 'unlocked';
        } else if (projectedTotal >= threshold * 0.8 && milestone.status === 'locked') {
          // Pipeline-aware approaching status
          newStatus = 'approaching';

          // Calculate projected unlock date based on velocity
          const daysInYear = 365;
          const daysPassed = Math.floor((Date.now() - new Date(yearStart).getTime()) / (1000 * 60 * 60 * 24));
          const dailyVelocity = currentRevenue / Math.max(daysPassed, 1);
          const remaining = threshold - currentRevenue;
          const daysToUnlock = Math.ceil(remaining / dailyVelocity);
          
          if (daysToUnlock > 0 && daysToUnlock < daysInYear) {
            const unlockDate = new Date();
            unlockDate.setDate(unlockDate.getDate() + daysToUnlock);
            projectedUnlockDate = unlockDate.toISOString().split('T')[0];
          }
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
              projected_unlock_date: projectedUnlockDate,
              pipeline_boost: weightedPipeline,
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

            // Track unlocks for celebration events and notifications
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

              // Send notifications to all team members
              await sendMilestoneNotifications(supabase, milestone.id, milestone.display_name, currentRevenue, 'unlocked');

              console.log(`🎉 MILESTONE UNLOCKED: ${milestone.display_name}`);
            }

            // Track approaching for alerts
            if (newStatus === 'approaching' && milestone.status === 'locked') {
              approaching.push(milestone.id);
              
              // Check if we should send approaching notification (once per day max)
              const lastNotified = milestone.last_notification_sent_at;
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              
              if (!lastNotified || lastNotified < oneDayAgo) {
                const remaining = threshold - currentRevenue;
                await sendMilestoneNotifications(supabase, milestone.id, milestone.display_name, remaining, 'approaching');
                
                await supabase
                  .from('revenue_milestones')
                  .update({ last_notification_sent_at: new Date().toISOString() })
                  .eq('id', milestone.id);
              }
            }
          }
        }
      }
    }

    // 7. Enhanced contribution attribution (sourcer/closer split)
    if (unlocks.length > 0) {
      // Get YTD placements with user attribution
      const placementsForAttribution = ytdPlacements || [];

      for (const milestoneId of unlocks) {
        for (const placement of placementsForAttribution) {
          const feeAmount = parseFloat(placement.fee_amount) || 0;

          // Attribution logic: 40% sourcer, 40% closer, 10% adder, 10% referrer (if exists)
          const attributions: Array<{ userId: string; role: string; amount: number }> = [];

          if (placement.sourced_by && placement.closed_by) {
            // Split between sourcer and closer
            attributions.push({
              userId: placement.sourced_by,
              role: 'sourcer',
              amount: feeAmount * 0.4
            });
            attributions.push({
              userId: placement.closed_by,
              role: 'closer',
              amount: feeAmount * 0.4
            });
            if (placement.added_by && placement.added_by !== placement.sourced_by && placement.added_by !== placement.closed_by) {
              attributions.push({
                userId: placement.added_by,
                role: 'adder',
                amount: feeAmount * 0.2
              });
            }
          } else if (placement.sourced_by) {
            attributions.push({
              userId: placement.sourced_by,
              role: 'sourcer',
              amount: feeAmount * 0.8
            });
            if (placement.added_by && placement.added_by !== placement.sourced_by) {
              attributions.push({
                userId: placement.added_by,
                role: 'adder',
                amount: feeAmount * 0.2
              });
            }
          } else if (placement.closed_by) {
            attributions.push({
              userId: placement.closed_by,
              role: 'closer',
              amount: feeAmount * 0.8
            });
            if (placement.added_by && placement.added_by !== placement.closed_by) {
              attributions.push({
                userId: placement.added_by,
                role: 'adder',
                amount: feeAmount * 0.2
              });
            }
          } else if (placement.added_by) {
            attributions.push({
              userId: placement.added_by,
              role: 'adder',
              amount: feeAmount
            });
          }

          // Insert contributions
          for (const attr of attributions) {
            await supabase
              .from('milestone_contributions')
              .insert({
                user_id: attr.userId,
                milestone_id: milestoneId,
                contribution_type: 'placement',
                contribution_role: attr.role,
                revenue_attributed: attr.amount,
                source_entity_type: 'placement_fee',
                source_entity_id: placement.id
              });
          }
        }
      }
    }

    // 8. Post to activity feed for unlocks
    if (unlocks.length > 0) {
      for (const milestoneId of unlocks) {
        const milestone = ladders?.flatMap(l => l.revenue_milestones).find(m => m?.id === milestoneId);
        if (milestone) {
          await supabase
            .from('activity_feed')
            .insert({
              event_type: 'milestone_unlocked',
              visibility: 'team',
              event_data: {
                milestone_id: milestoneId,
                milestone_name: milestone.display_name,
                threshold: milestone.threshold_amount,
                achieved_revenue: milestone.achieved_revenue
              }
            });
        }
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      revenue: {
        ytd: { collected: collectedRevenue, booked: bookedRevenue },
        lifetime: { collected: lifetimeCollected, booked: lifetimeBooked, combined: combinedLifetime },
        moneybird: moneybirdLifetime,
        pipeline: weightedPipeline
      },
      updates: updates.length,
      unlocks: unlocks.length,
      approaching: approaching.length,
      details: updates
    };

    console.log(`✅ Milestone calculation complete: ${updates.length} updates, ${unlocks.length} unlocks, ${approaching.length} approaching`);

    return new Response(JSON.stringify(response), {
      headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to send milestone notifications
async function sendMilestoneNotifications(
  supabase: any,
  milestoneId: string,
  milestoneName: string,
  amount: number,
  type: 'unlocked' | 'approaching'
) {
  try {
    // Get all team members (profiles with active status)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('status', 'active');

    if (profilesError || !profiles) {
      console.error('Failed to fetch profiles for notifications:', profilesError);
      return;
    }

    const userIds = profiles.map((p: { id: string }) => p.id);

    if (userIds.length === 0) return;

    const title = type === 'unlocked' 
      ? `🎉 Milestone Unlocked: ${milestoneName}`
      : `📈 Almost There: ${milestoneName}`;

    const body = type === 'unlocked'
      ? `Team achieved €${amount.toLocaleString()}!`
      : `Only €${amount.toLocaleString()} remaining to unlock this milestone!`;

    // Create in-app notifications
    const notifications = userIds.map((userId: string) => ({
      user_id: userId,
      type: type === 'unlocked' ? 'milestone_unlocked' : 'milestone_approaching',
      title,
      content: body,
      action_url: '/admin/revenue-ladder',
      metadata: { milestone_id: milestoneId },
      is_read: false,
    }));

    await supabase.from('notifications').insert(notifications);

    // Invoke push notification function
    await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: userIds,
        notification_type: 'system',
        title,
        body,
        route: '/admin/revenue-ladder',
        data: { milestone_id: milestoneId },
        create_in_app: false, // Already created above
      },
    });

    console.log(`📬 Sent ${type} notifications to ${userIds.length} users`);
  } catch (err) {
    console.error('Failed to send milestone notifications:', err);
  }
}

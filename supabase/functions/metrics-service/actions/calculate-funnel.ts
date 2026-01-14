/**
 * Funnel metrics calculation action handler
 * Handles conversion funnels, target progress, lead scoring
 */

import type { MetricsContext, ActionResult } from "../index.ts";

interface FunnelPayload {
  type?: "conversion" | "target-progress" | "lead-scoring" | "all";
  funnel_type?: "application" | "booking" | "sales";
  user_id?: string;
  period?: "week" | "month" | "quarter";
}

interface FunnelStage {
  name: string;
  count: number;
  conversion_rate?: number;
  drop_off_rate?: number;
  avg_time_in_stage?: number;
}

interface FunnelMetric {
  metric_name: string;
  stages?: FunnelStage[];
  overall_conversion?: number;
  total_entries?: number;
  total_exits?: number;
  metadata?: Record<string, unknown>;
}

export async function calculateFunnelAction(ctx: MetricsContext): Promise<ActionResult> {
  const payload = ctx.payload as unknown as FunnelPayload;
  const type = payload.type || "all";
  
  try {
    const metrics: FunnelMetric[] = [];
    const now = new Date();
    const periodStart = getPeriodStart(payload.period || "month", now);

    if (type === "all" || type === "conversion") {
      const funnelType = payload.funnel_type || "application";
      const conversionMetrics = await calculateConversionFunnel(ctx, funnelType, periodStart);
      metrics.push(...conversionMetrics);
    }

    if (type === "all" || type === "target-progress") {
      const targetMetrics = await calculateTargetProgress(ctx, payload.user_id);
      metrics.push(...targetMetrics);
    }

    if (type === "all" || type === "lead-scoring") {
      const leadMetrics = await calculateLeadConversion(ctx, periodStart);
      metrics.push(...leadMetrics);
    }

    return {
      success: true,
      data: {
        metrics,
        period: { start: periodStart, end: now.toISOString() },
        calculated_at: now.toISOString(),
      },
    };

  } catch (error) {
    console.error("[calculate-funnel] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to calculate funnel metrics",
    };
  }
}

function getPeriodStart(period: string, now: Date): string {
  const start = new Date(now);
  switch (period) {
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
  }
  return start.toISOString();
}

async function calculateConversionFunnel(
  ctx: MetricsContext,
  funnelType: string,
  periodStart: string
): Promise<FunnelMetric[]> {
  const metrics: FunnelMetric[] = [];

  if (funnelType === "application") {
    // Application funnel stages
    const stages = ["applied", "screening", "interview", "final_interview", "offer", "hired"];
    const stageCounts: FunnelStage[] = [];
    
    let previousCount = 0;
    for (const stage of stages) {
      const { count } = await ctx.supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", stage)
        .gte("created_at", periodStart);

      const stageCount = count || 0;
      const conversionRate = previousCount > 0 ? (stageCount / previousCount) * 100 : 100;
      const dropOffRate = previousCount > 0 ? ((previousCount - stageCount) / previousCount) * 100 : 0;

      stageCounts.push({
        name: stage,
        count: stageCount,
        conversion_rate: Math.round(conversionRate * 10) / 10,
        drop_off_rate: Math.round(dropOffRate * 10) / 10,
      });

      previousCount = stageCount;
    }

    const totalEntries = stageCounts[0]?.count || 0;
    const totalExits = stageCounts[stageCounts.length - 1]?.count || 0;
    const overallConversion = totalEntries > 0 ? (totalExits / totalEntries) * 100 : 0;

    metrics.push({
      metric_name: "application_funnel",
      stages: stageCounts,
      overall_conversion: Math.round(overallConversion * 10) / 10,
      total_entries: totalEntries,
      total_exits: totalExits,
    });
  }

  if (funnelType === "booking") {
    // Booking funnel stages
    const { data: bookingEvents } = await ctx.supabase
      .from("booking_funnel_events")
      .select("event_type, session_id")
      .gte("created_at", periodStart);

    const eventCounts: Record<string, number> = {};
    const sessionsByEvent: Record<string, Set<string>> = {};
    
    for (const event of bookingEvents || []) {
      eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
      if (!sessionsByEvent[event.event_type]) {
        sessionsByEvent[event.event_type] = new Set();
      }
      sessionsByEvent[event.event_type].add(event.session_id);
    }

    const bookingStages: FunnelStage[] = [
      { name: "page_view", count: sessionsByEvent["page_view"]?.size || 0 },
      { name: "time_slot_view", count: sessionsByEvent["time_slot_view"]?.size || 0 },
      { name: "time_slot_selected", count: sessionsByEvent["time_slot_selected"]?.size || 0 },
      { name: "form_started", count: sessionsByEvent["form_started"]?.size || 0 },
      { name: "booking_completed", count: sessionsByEvent["booking_completed"]?.size || 0 },
    ];

    // Calculate conversion rates
    for (let i = 1; i < bookingStages.length; i++) {
      const prev = bookingStages[i - 1].count;
      const curr = bookingStages[i].count;
      bookingStages[i].conversion_rate = prev > 0 ? Math.round((curr / prev) * 100 * 10) / 10 : 0;
      bookingStages[i].drop_off_rate = prev > 0 ? Math.round(((prev - curr) / prev) * 100 * 10) / 10 : 0;
    }

    metrics.push({
      metric_name: "booking_funnel",
      stages: bookingStages,
      overall_conversion: bookingStages[0].count > 0 
        ? Math.round((bookingStages[bookingStages.length - 1].count / bookingStages[0].count) * 100 * 10) / 10 
        : 0,
      total_entries: bookingStages[0].count,
      total_exits: bookingStages[bookingStages.length - 1].count,
    });
  }

  return metrics;
}

async function calculateTargetProgress(
  ctx: MetricsContext,
  userId?: string
): Promise<FunnelMetric[]> {
  const metrics: FunnelMetric[] = [];

  // Get active targets
  const now = new Date().toISOString().split("T")[0];
  let query = ctx.supabase
    .from("employee_targets")
    .select("*, employee_profiles!inner(user_id, profiles(full_name))")
    .lte("period_start", now)
    .gte("period_end", now);

  if (userId) {
    query = query.eq("employee_profiles.user_id", userId);
  }

  const { data: targets } = await query;

  const targetProgress: Array<{
    name: string;
    target: number;
    current: number;
    progress_percent: number;
    on_track: boolean;
  }> = [];

  for (const target of targets || []) {
    const profile = (target.employee_profiles as any)?.profiles;
    const periodStart = target.period_start;
    const periodEnd = target.period_end;
    const userId = (target.employee_profiles as any)?.user_id;

    // Calculate actual values based on target type
    let currentValue = 0;
    
    if (target.target_type === "placements") {
      const { count } = await ctx.supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("sourced_by", userId)
        .eq("status", "hired")
        .gte("updated_at", periodStart)
        .lte("updated_at", periodEnd);
      currentValue = count || 0;
    } else if (target.target_type === "candidates_sourced") {
      const { count } = await ctx.supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("sourced_by", userId)
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd);
      currentValue = count || 0;
    } else if (target.target_type === "interviews") {
      const { data: apps } = await ctx.supabase
        .from("applications")
        .select("stages")
        .eq("sourced_by", userId)
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd);
      
      currentValue = (apps || []).filter(a => {
        const stages = a.stages as any[];
        return stages?.some(s => s.name?.toLowerCase().includes("interview"));
      }).length;
    }

    const progressPercent = target.target_value > 0 
      ? Math.round((currentValue / target.target_value) * 100) 
      : 0;

    // Calculate if on track based on period progress
    const periodStartDate = new Date(periodStart);
    const periodEndDate = new Date(periodEnd);
    const nowDate = new Date();
    const periodProgress = (nowDate.getTime() - periodStartDate.getTime()) / 
      (periodEndDate.getTime() - periodStartDate.getTime());
    const expectedProgress = periodProgress * 100;
    const onTrack = progressPercent >= expectedProgress * 0.9;

    targetProgress.push({
      name: `${profile?.full_name || "Unknown"} - ${target.target_type}`,
      target: target.target_value,
      current: currentValue,
      progress_percent: progressPercent,
      on_track: onTrack,
    });
  }

  metrics.push({
    metric_name: "target_progress",
    metadata: {
      targets: targetProgress,
      total_on_track: targetProgress.filter(t => t.on_track).length,
      total_targets: targetProgress.length,
    },
  });

  return metrics;
}

async function calculateLeadConversion(
  ctx: MetricsContext,
  periodStart: string
): Promise<FunnelMetric[]> {
  const metrics: FunnelMetric[] = [];

  // Get lead scores
  const { data: leads } = await ctx.supabase
    .from("lead_scores")
    .select("score, is_sql, is_mql, created_at")
    .gte("created_at", periodStart);

  const totalLeads = leads?.length || 0;
  const mqls = leads?.filter(l => l.is_mql).length || 0;
  const sqls = leads?.filter(l => l.is_sql).length || 0;
  const avgScore = leads && leads.length > 0
    ? leads.reduce((sum, l) => sum + (l.score || 0), 0) / leads.length
    : 0;

  const leadStages: FunnelStage[] = [
    { name: "total_leads", count: totalLeads },
    { 
      name: "mql", 
      count: mqls,
      conversion_rate: totalLeads > 0 ? Math.round((mqls / totalLeads) * 100 * 10) / 10 : 0,
    },
    { 
      name: "sql", 
      count: sqls,
      conversion_rate: mqls > 0 ? Math.round((sqls / mqls) * 100 * 10) / 10 : 0,
    },
  ];

  metrics.push({
    metric_name: "lead_conversion",
    stages: leadStages,
    overall_conversion: totalLeads > 0 ? Math.round((sqls / totalLeads) * 100 * 10) / 10 : 0,
    total_entries: totalLeads,
    total_exits: sqls,
    metadata: { average_lead_score: Math.round(avgScore * 10) / 10 },
  });

  return metrics;
}

/**
 * KPI calculation action handler
 * Consolidates all KPI calculations
 */

import type { MetricsContext, ActionResult } from "../index.ts";

interface KpiPayload {
  category?: "north_star" | "sales" | "marketing" | "operations" | "all";
  period?: "day" | "week" | "month" | "quarter" | "year";
  start_date?: string;
  end_date?: string;
}

interface KpiResult {
  category: string;
  kpi_name: string;
  value: number;
  target_value?: number;
  threshold_warning?: number;
  threshold_critical?: number;
  trend_direction?: "up" | "down" | "stable";
  trend_percentage?: number;
  metadata?: Record<string, unknown>;
}

export async function calculateKpisAction(ctx: MetricsContext): Promise<ActionResult> {
  const payload = ctx.payload as unknown as KpiPayload;
  const category = payload.category || "all";
  
  try {
    const kpis: KpiResult[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = payload.start_date || thirtyDaysAgo.toISOString().split("T")[0];
    const endDate = payload.end_date || now.toISOString().split("T")[0];

    // North Star Metrics
    if (category === "all" || category === "north_star") {
      const northStarKpis = await calculateNorthStarKpis(ctx, startDate, endDate);
      kpis.push(...northStarKpis);
    }

    // Sales Metrics
    if (category === "all" || category === "sales") {
      const salesKpis = await calculateSalesKpis(ctx, startDate, endDate);
      kpis.push(...salesKpis);
    }

    // Marketing Metrics
    if (category === "all" || category === "marketing") {
      const marketingKpis = await calculateMarketingKpis(ctx, startDate, endDate);
      kpis.push(...marketingKpis);
    }

    // Operations Metrics
    if (category === "all" || category === "operations") {
      const operationsKpis = await calculateOperationsKpis(ctx, startDate, endDate);
      kpis.push(...operationsKpis);
    }

    // Store KPIs in database
    if (kpis.length > 0) {
      const today = now.toISOString().split("T")[0];
      for (const kpi of kpis) {
        await ctx.supabase.from("kpi_metrics").upsert({
          date: today,
          category: kpi.category,
          kpi_name: kpi.kpi_name,
          value: kpi.value,
          target_value: kpi.target_value,
          threshold_warning: kpi.threshold_warning,
          threshold_critical: kpi.threshold_critical,
          trend_direction: kpi.trend_direction,
          trend_percentage: kpi.trend_percentage,
          metadata: kpi.metadata,
        }, {
          onConflict: "date,kpi_name",
        });
      }
    }

    return { 
      success: true, 
      data: { 
        kpis,
        period: { start: startDate, end: endDate },
        calculated_at: now.toISOString()
      } 
    };

  } catch (error) {
    console.error("[calculate-kpis] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to calculate KPIs" 
    };
  }
}

async function calculateNorthStarKpis(
  ctx: MetricsContext, 
  startDate: string, 
  endDate: string
): Promise<KpiResult[]> {
  const kpis: KpiResult[] = [];

  // Placements (hired candidates)
  const { count: placements } = await ctx.supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "hired")
    .gte("updated_at", startDate)
    .lte("updated_at", endDate);

  kpis.push({
    category: "north_star",
    kpi_name: "monthly_placements",
    value: placements || 0,
    target_value: 10,
    threshold_warning: 7,
    threshold_critical: 4,
    trend_direction: "stable",
  });

  // Active Candidates
  const { count: activeCandidates } = await ctx.supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "candidate")
    .gte("updated_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  kpis.push({
    category: "north_star",
    kpi_name: "active_candidates",
    value: activeCandidates || 0,
    target_value: 500,
    threshold_warning: 350,
    threshold_critical: 200,
  });

  // Active Jobs
  const { count: activeJobs } = await ctx.supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  kpis.push({
    category: "north_star",
    kpi_name: "active_jobs",
    value: activeJobs || 0,
    target_value: 50,
    threshold_warning: 30,
    threshold_critical: 15,
  });

  return kpis;
}

async function calculateSalesKpis(
  ctx: MetricsContext, 
  startDate: string, 
  endDate: string
): Promise<KpiResult[]> {
  const kpis: KpiResult[] = [];

  // Pipeline Value
  const { data: pipeline } = await ctx.supabase
    .from("applications")
    .select("jobs!inner(salary_min, salary_max, job_fee_percentage)")
    .in("status", ["applied", "screening", "interview", "final_interview"])
    .gte("created_at", startDate);

  const pipelineValue = pipeline?.reduce((sum, app) => {
    const job = app.jobs as any;
    const avgSalary = ((job.salary_min || 0) + (job.salary_max || 0)) / 2;
    const feePercentage = job.job_fee_percentage || 20;
    return sum + (avgSalary * feePercentage / 100);
  }, 0) || 0;

  kpis.push({
    category: "sales",
    kpi_name: "pipeline_value",
    value: Math.round(pipelineValue),
    target_value: 500000,
    metadata: { currency: "EUR" },
  });

  // Win Rate
  const { count: totalClosed } = await ctx.supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .in("status", ["hired", "rejected", "withdrawn"])
    .gte("updated_at", startDate);

  const { count: won } = await ctx.supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "hired")
    .gte("updated_at", startDate);

  const winRate = totalClosed && totalClosed > 0 ? (won || 0) / totalClosed * 100 : 0;

  kpis.push({
    category: "sales",
    kpi_name: "win_rate",
    value: Math.round(winRate * 10) / 10,
    target_value: 25,
    threshold_warning: 20,
    threshold_critical: 15,
    metadata: { unit: "percent" },
  });

  return kpis;
}

async function calculateMarketingKpis(
  ctx: MetricsContext, 
  startDate: string, 
  _endDate: string
): Promise<KpiResult[]> {
  const kpis: KpiResult[] = [];

  // Ad spend and conversions
  const { data: adData } = await ctx.supabase
    .from("ad_campaigns")
    .select("spend, conversions, clicks, impressions")
    .gte("date", startDate);

  const totalSpend = adData?.reduce((sum, c) => sum + (Number(c.spend) || 0), 0) || 0;
  const totalConversions = adData?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
  const totalClicks = adData?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;

  // Cost Per Lead
  const cpl = totalConversions > 0 ? totalSpend / totalConversions : 0;
  kpis.push({
    category: "marketing",
    kpi_name: "cost_per_lead",
    value: Math.round(cpl * 100) / 100,
    target_value: 150,
    threshold_warning: 175,
    threshold_critical: 200,
    metadata: { currency: "EUR", total_spend: totalSpend, total_leads: totalConversions },
  });

  // Click-Through Rate
  const totalImpressions = adData?.reduce((sum, c) => sum + (c.impressions || 0), 0) || 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  kpis.push({
    category: "marketing",
    kpi_name: "ctr",
    value: Math.round(ctr * 100) / 100,
    target_value: 3.5,
    threshold_warning: 2.5,
    threshold_critical: 1.5,
    metadata: { unit: "percent" },
  });

  return kpis;
}

async function calculateOperationsKpis(
  ctx: MetricsContext, 
  startDate: string, 
  _endDate: string
): Promise<KpiResult[]> {
  const kpis: KpiResult[] = [];

  // Time to Fill (average days from job posting to hire)
  const { data: hires } = await ctx.supabase
    .from("applications")
    .select("created_at, updated_at, jobs!inner(created_at)")
    .eq("status", "hired")
    .gte("updated_at", startDate);

  let totalDays = 0;
  let hireCount = 0;
  for (const hire of hires || []) {
    const jobCreated = new Date((hire.jobs as any).created_at);
    const hireDate = new Date(hire.updated_at);
    const days = (hireDate.getTime() - jobCreated.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 0 && days < 365) {
      totalDays += days;
      hireCount++;
    }
  }

  const avgTimeToFill = hireCount > 0 ? totalDays / hireCount : 0;
  kpis.push({
    category: "operations",
    kpi_name: "time_to_fill",
    value: Math.round(avgTimeToFill),
    target_value: 45,
    threshold_warning: 60,
    threshold_critical: 90,
    metadata: { unit: "days", sample_size: hireCount },
  });

  // Response Rate (applications with activity within 48h)
  const { count: totalApps } = await ctx.supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate);

  const { count: respondedApps } = await ctx.supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate)
    .not("current_stage_index", "eq", 0);

  const responseRate = totalApps && totalApps > 0 ? ((respondedApps || 0) / totalApps) * 100 : 0;
  kpis.push({
    category: "operations",
    kpi_name: "response_rate",
    value: Math.round(responseRate),
    target_value: 95,
    threshold_warning: 85,
    threshold_critical: 70,
    metadata: { unit: "percent" },
  });

  return kpis;
}

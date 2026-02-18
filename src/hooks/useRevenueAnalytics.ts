import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export type PeriodType = 'thisMonth' | 'lastMonth' | '3m' | '6m' | 'ytd' | '1y' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

export interface ChartDataPoint {
  label: string;
  revenue: number;
  hires: number;
  prevRevenue?: number;
}

export interface PipelineStage {
  stage: string;
  count: number;
  probability: number;
  weightedValue: number;
}

export interface RevenueAnalytics {
  // Core metrics
  totalRevenue: number;
  totalHires: number;
  avgRevenuePerPlacement: number;
  revenuePerWorkingDay: number;
  bestMonthRevenue: number;
  bestMonthLabel: string;

  // Comparison deltas (percentage)
  revenueDelta: number;
  hiresDelta: number;
  avgRevenueDelta: number;
  revenuePerDayDelta: number;

  // Chart data
  chartData: ChartDataPoint[];

  // Pipeline
  pipeline: PipelineStage[];
  totalPipelineValue: number;
  expectedClosings: number;

  // Forecasting
  projectedMonthEnd: number;
  daysElapsed: number;
  daysInMonth: number;

  // Growth indicators
  growth: {
    users: number;
    companies: number;
    jobs: number;
    applications: number;
  };
}

const STAGE_PROBABILITIES: Record<string, number> = {
  applied: 0.1,
  screening: 0.25,
  interview: 0.5,
  offer: 0.8,
};

function getDateRange(period: PeriodType, customRange?: DateRange): { current: DateRange; comparison: DateRange } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  let currentStart: Date;
  let currentEnd = today;
  let compStart: Date;
  let compEnd: Date;

  switch (period) {
    case 'thisMonth':
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      compStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      compEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'lastMonth':
      currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      compStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      compEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
      break;
    case '3m': {
      currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      compStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      compEnd = new Date(now.getFullYear(), now.getMonth() - 3, 0);
      break;
    }
    case '6m': {
      currentStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      compStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      compEnd = new Date(now.getFullYear(), now.getMonth() - 6, 0);
      break;
    }
    case 'ytd':
      currentStart = new Date(now.getFullYear(), 0, 1);
      compStart = new Date(now.getFullYear() - 1, 0, 1);
      compEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case '1y':
      currentStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      compStart = new Date(now.getFullYear() - 2, now.getMonth(), 1);
      compEnd = new Date(now.getFullYear() - 1, now.getMonth(), 0);
      break;
    case 'custom':
      if (customRange) {
        currentStart = customRange.start;
        currentEnd = customRange.end;
        const duration = currentEnd.getTime() - currentStart.getTime();
        compEnd = new Date(currentStart.getTime() - 1);
        compStart = new Date(compEnd.getTime() - duration);
      } else {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        compStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        compEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      }
      break;
    default:
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      compStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      compEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  }

  return {
    current: { start: currentStart, end: currentEnd },
    comparison: { start: compStart, end: compEnd },
  };
}

function getBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 1);
}

function getMonthsBetween(start: Date, end: Date): { start: Date; end: Date; label: string }[] {
  const months: { start: Date; end: Date; label: string }[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    const monthStart = new Date(d);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    months.push({
      start: monthStart,
      end: monthEnd > end ? end : monthEnd,
      label: monthStart.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
    });
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

function calcDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

async function fetchHireCount(start: Date, end: Date): Promise<number> {
  const { count } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'hired')
    .gte('updated_at', start.toISOString())
    .lte('updated_at', end.toISOString());
  return count || 0;
}

async function fetchCountSince(table: 'profiles' | 'companies' | 'jobs' | 'applications', start: Date, end: Date): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  return count || 0;
}

export function useRevenueAnalytics(period: PeriodType, customRange?: DateRange) {
  const { settings } = usePlatformSettings();

  return useQuery<RevenueAnalytics>({
    queryKey: ['revenue-analytics', period, customRange?.start?.toISOString(), customRange?.end?.toISOString(), settings],
    queryFn: async () => {
      const { current, comparison } = getDateRange(period, customRange);
      const fee = settings.estimated_placement_fee;

      // Get monthly chart data for current period
      const currentMonths = getMonthsBetween(current.start, current.end);
      const compMonths = getMonthsBetween(comparison.start, comparison.end);

      // Fetch current period monthly hires
      const currentMonthlyHires = await Promise.all(
        currentMonths.map(m => fetchHireCount(m.start, m.end))
      );

      // Fetch comparison period monthly hires
      const compMonthlyHires = await Promise.all(
        compMonths.map(m => fetchHireCount(m.start, m.end))
      );

      // Build chart data
      const chartData: ChartDataPoint[] = currentMonths.map((m, i) => ({
        label: m.label,
        revenue: currentMonthlyHires[i] * fee,
        hires: currentMonthlyHires[i],
        prevRevenue: compMonthlyHires[i] !== undefined ? compMonthlyHires[i] * fee : undefined,
      }));

      // Core metrics
      const totalHires = currentMonthlyHires.reduce((s, h) => s + h, 0);
      const totalRevenue = totalHires * fee;
      const compTotalHires = compMonthlyHires.reduce((s, h) => s + h, 0);
      const compTotalRevenue = compTotalHires * fee;

      const businessDays = getBusinessDays(current.start, new Date() < current.end ? new Date() : current.end);
      const compBusinessDays = getBusinessDays(comparison.start, comparison.end);

      const avgPerPlacement = totalHires > 0 ? totalRevenue / totalHires : 0;
      const compAvgPerPlacement = compTotalHires > 0 ? compTotalRevenue / compTotalHires : 0;

      const revenuePerDay = totalRevenue / businessDays;
      const compRevenuePerDay = compTotalRevenue / compBusinessDays;

      // Best month
      let bestIdx = 0;
      currentMonthlyHires.forEach((h, i) => {
        if (h > currentMonthlyHires[bestIdx]) bestIdx = i;
      });

      // Pipeline
      const stages = ['applied', 'screening', 'interview', 'offer'] as const;
      const pipelineCounts = await Promise.all(
        stages.map(async (stage) => {
          const { count } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', stage);
          return count || 0;
        })
      );

      const pipeline: PipelineStage[] = stages.map((stage, i) => ({
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        count: pipelineCounts[i],
        probability: STAGE_PROBABILITIES[stage],
        weightedValue: pipelineCounts[i] * fee * STAGE_PROBABILITIES[stage],
      }));

      const totalPipelineValue = pipeline.reduce((s, p) => s + p.weightedValue, 0);
      const expectedClosings = pipeline.reduce((s, p) => s + Math.round(p.count * p.probability), 0);

      // Forecasting (for thisMonth)
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysElapsed = now.getDate();
      const projectedMonthEnd = daysElapsed > 0 
        ? (totalRevenue / daysElapsed) * daysInMonth 
        : totalRevenue;

      // Growth indicators (current vs comparison period)
      const [curUsers, compUsers, curCompanies, compCompaniesCount, curJobs, compJobsCount, curApps, compAppsCount] = await Promise.all([
        fetchCountSince('profiles', current.start, current.end),
        fetchCountSince('profiles', comparison.start, comparison.end),
        fetchCountSince('companies', current.start, current.end),
        fetchCountSince('companies', comparison.start, comparison.end),
        fetchCountSince('jobs', current.start, current.end),
        fetchCountSince('jobs', comparison.start, comparison.end),
        fetchCountSince('applications', current.start, current.end),
        fetchCountSince('applications', comparison.start, comparison.end),
      ]);

      return {
        totalRevenue,
        totalHires,
        avgRevenuePerPlacement: avgPerPlacement,
        revenuePerWorkingDay: revenuePerDay,
        bestMonthRevenue: currentMonthlyHires[bestIdx] * fee,
        bestMonthLabel: currentMonths[bestIdx]?.label || '',

        revenueDelta: calcDelta(totalRevenue, compTotalRevenue),
        hiresDelta: calcDelta(totalHires, compTotalHires),
        avgRevenueDelta: calcDelta(avgPerPlacement, compAvgPerPlacement),
        revenuePerDayDelta: calcDelta(revenuePerDay, compRevenuePerDay),

        chartData,

        pipeline,
        totalPipelineValue,
        expectedClosings,

        projectedMonthEnd,
        daysElapsed,
        daysInMonth,

        growth: {
          users: calcDelta(curUsers, compUsers),
          companies: calcDelta(curCompanies, compCompaniesCount),
          jobs: calcDelta(curJobs, compJobsCount),
          applications: calcDelta(curApps, compAppsCount),
        },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { Loader2 } from "lucide-react";

export function RevenueCharts() {
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['revenue-trend'],
    queryFn: async () => {
      // Get realized placement revenue
      const { data: placementData } = await supabase
        .from('placement_fees')
        .select('hired_date, fee_amount')
        .eq('status', 'paid')
        .gte('hired_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('hired_date');

      // Get projected revenue from weighted pipeline (active deals)
      const { data: projectedData } = await supabase
        .from('jobs')
        .select('created_at, deal_value_override, deal_probability, salary_max')
        .in('status', ['published'])
        .eq('is_lost', false);

      // Aggregate by month
      const monthlyData = new Map();
      
      placementData?.forEach(item => {
        const month = new Date(item.hired_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { month, realized: 0, projected: 0 });
        }
        const current = monthlyData.get(month);
        current.realized += item.fee_amount;
      });

      projectedData?.forEach(item => {
        const month = new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { month, realized: 0, projected: 0 });
        }
        const current = monthlyData.get(month);
        const dealValue = item.deal_value_override || (item.salary_max || 60000) * 0.2;
        current.projected += dealValue * ((item.deal_probability || 50) / 100);
      });

      return Array.from(monthlyData.values()).slice(-12);
    },
  });

  const { data: pipelineVelocity, isLoading: velocityLoading } = useQuery({
    queryKey: ['pipeline-velocity'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('deal_stage_history')
        .select('from_stage, to_stage, created_at, duration_days')
        .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at');

      const { data: stageOrder } = await (supabase as any)
        .from('deal_stages')
        .select('name, stage_order');
      
      const orderMap: Record<string, number> = {};
      stageOrder?.forEach((s: any) => {
        orderMap[s.name.toLowerCase()] = s.stage_order;
      });

      const monthlyData = new Map();
      
      data?.forEach((transition: any) => {
        const month = new Date(transition.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { month, progressions: 0, regressions: 0, closures: 0 });
        }
        const current = monthlyData.get(month);
        const toStage = (transition.to_stage || '').toLowerCase();
        const fromStage = (transition.from_stage || '').toLowerCase();
        if (toStage.includes('closed')) {
          current.closures += 1;
        } else {
          const fromOrder = orderMap[fromStage] ?? 0;
          const toOrder = orderMap[toStage] ?? 0;
          if (toOrder > fromOrder) {
            current.progressions += 1;
          } else {
            current.regressions += 1;
          }
        }
      });

      return Array.from(monthlyData.values()).slice(-6);
    },
  });

  if (isLoading || velocityLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Revenue Trend</h3>
        <DynamicChart
          type="line"
          data={revenueData || []}
          height={300}
          config={{
            lines: [
              { dataKey: 'realized', stroke: 'hsl(var(--primary))', strokeWidth: 2, name: 'Realized Revenue' },
              { dataKey: 'projected', stroke: 'hsl(var(--success))', strokeWidth: 2, name: 'Projected Revenue' },
            ],
            xAxisDataKey: 'month',
            showGrid: true,
            showTooltip: true,
            legend: true,
            yAxisFormatter: (value) => `€${(value / 1000).toFixed(0)}k`,
            tooltip: {
              formatter: (value: number) => `€${value.toLocaleString()}`,
            },
          }}
        />
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Pipeline Velocity</h3>
        <DynamicChart
          type="bar"
          data={pipelineVelocity || []}
          height={300}
          config={{
            bars: [
              { dataKey: 'progressions', fill: 'hsl(var(--primary))', name: 'Progressions' },
              { dataKey: 'closures', fill: 'hsl(var(--success))', name: 'Closures' },
              { dataKey: 'regressions', fill: 'hsl(var(--destructive))', name: 'Regressions' },
            ],
            xAxisDataKey: 'month',
            showGrid: true,
            showTooltip: true,
            legend: true,
          }}
        />
      </Card>
    </div>
  );
}

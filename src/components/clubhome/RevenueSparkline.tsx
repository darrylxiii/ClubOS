import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardWidget } from "./DashboardWidget";
import { DollarSign, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export const RevenueSparkline = () => {
  const { settings } = usePlatformSettings();

  const { data, isLoading } = useQuery({
    queryKey: ['revenue-sparkline', settings],
    queryFn: async () => {
      const now = new Date();
      const placementFee = settings.estimated_placement_fee;

      // Get monthly hire counts for sparkline (last 6 months)
      const months: { label: string; hires: number; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthLabel = monthStart.toLocaleDateString('en', { month: 'short' });

        const { count } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'hired')
          .gte('updated_at', monthStart.toISOString())
          .lt('updated_at', monthEnd.toISOString());

        const hires = count || 0;
        months.push({ label: monthLabel, hires, revenue: hires * placementFee });
      }

      const currentMonth = months[months.length - 1];
      const lastMonth = months[months.length - 2];
      const trend = lastMonth.revenue > 0
        ? Math.round(((currentMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100)
        : currentMonth.revenue > 0 ? 100 : 0;

      // Pipeline value
      const { count: pipelineCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['applied', 'screening', 'interview', 'offer']);

      const pipelineValue = (pipelineCount || 0) * placementFee * settings.pipeline_conversion_rate;

      return {
        months,
        currentRevenue: currentMonth.revenue,
        currentHires: currentMonth.hires,
        trend,
        pipelineValue,
        pipelineCount: pipelineCount || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('nl-NL', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);

  const isPositive = (data?.trend || 0) >= 0;

  return (
    <DashboardWidget
      title="Revenue & Growth"
      icon={DollarSign}
      iconClassName="text-premium"
      isLoading={isLoading}
      headerAction={
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link to="/admin/kpi-command-center">
            Details <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Primary metric */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            This Month ({data?.currentHires || 0} placements)
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {formatCurrency(data?.currentRevenue || 0)}
            </span>
            {data && data.trend !== 0 && (
              <div className={`flex items-center text-xs ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                {Math.abs(data.trend)}%
              </div>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {data?.months && data.months.length > 0 && (
          <div className="h-[80px] -mx-2">
            <DynamicChart
              type="area"
              data={data.months}
              height={80}
            config={{
                areas: [{ dataKey: 'revenue', fill: 'hsl(var(--primary) / 0.15)', stroke: 'hsl(var(--primary))', fillOpacity: 0.3 }],
                xAxisDataKey: 'label',
                xAxisTick: { fontSize: 10 },
                showTooltip: true,
                showGrid: false,
              }}
            />
          </div>
        )}

        {/* Pipeline */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-premium/10 border border-premium/20">
          <div>
            <p className="text-xs text-muted-foreground">Pipeline Value</p>
            <p className="font-semibold text-premium">{formatCurrency(data?.pipelineValue || 0)}</p>
          </div>
          <span className="text-xs text-muted-foreground">{data?.pipelineCount || 0} active</span>
        </div>
      </div>
    </DashboardWidget>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { T } from "@/components/T";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Configuration constant - can be adjusted or moved to settings
const ESTIMATED_PLACEMENT_FEE = 15000; // €15,000 average placement fee
const PIPELINE_CONVERSION_RATE = 0.3; // 30% estimated conversion rate

interface RevenueData {
  currentMonth: number;
  lastMonth: number;
  pipelineValue: number;
  trend: number;
  currentHires: number;
  lastMonthHires: number;
  pipelineCount: number;
}

export const RevenueOverviewWidget = () => {
  const { data: revenue, isLoading } = useQuery({
    queryKey: ['revenue-overview'],
    queryFn: async (): Promise<RevenueData> => {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      // Get current month placements (hired applications)
      const { count: currentHires } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hired')
        .gte('updated_at', currentMonthStart);

      // Get last month placements
      const { count: lastMonthHires } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hired')
        .gte('updated_at', lastMonthStart)
        .lt('updated_at', lastMonthEnd);

      // Get pipeline (active applications)
      const { count: pipelineCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['applied', 'screening', 'interview', 'offer']);

      // Calculate revenue estimates
      const currentMonth = (currentHires || 0) * ESTIMATED_PLACEMENT_FEE;
      const lastMonth = (lastMonthHires || 0) * ESTIMATED_PLACEMENT_FEE;
      const pipelineValue = (pipelineCount || 0) * ESTIMATED_PLACEMENT_FEE * PIPELINE_CONVERSION_RATE;

      const trend = lastMonth > 0 
        ? ((currentMonth - lastMonth) / lastMonth) * 100 
        : currentMonth > 0 ? 100 : 0;

      return {
        currentMonth,
        lastMonth,
        pipelineValue,
        trend: Math.round(trend),
        currentHires: currentHires || 0,
        lastMonthHires: lastMonthHires || 0,
        pipelineCount: pipelineCount || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <Skeleton className="h-8 w-24" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositiveTrend = (revenue?.trend || 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-premium" />
              <T k="common:admin.revenueOverview" fallback="Revenue Overview" />
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Estimated based on {formatCurrency(ESTIMATED_PLACEMENT_FEE)} avg placement fee × {revenue?.currentHires || 0} hires this month</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/admin/kpi-command-center">
                <T k="common:actions.viewAll" fallback="View All" />
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {/* Current Month Revenue */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              <T k="common:metrics.currentMonth" fallback="This Month" />
              <span className="ml-1">({revenue?.currentHires || 0} placements)</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{formatCurrency(revenue?.currentMonth || 0)}</span>
              {revenue && revenue.trend !== 0 && (
                <div className={`flex items-center text-xs ${isPositiveTrend ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositiveTrend ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(revenue.trend)}%
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">
                <T k="common:metrics.lastMonth" fallback="Last Month" />
              </p>
              <p className="font-semibold">{formatCurrency(revenue?.lastMonth || 0)}</p>
              <p className="text-xs text-muted-foreground">{revenue?.lastMonthHires || 0} placements</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-premium/10 border border-premium/20 cursor-help">
                  <p className="text-xs text-muted-foreground">
                    <T k="common:metrics.pipeline" fallback="Pipeline Value" />
                  </p>
                  <p className="font-semibold text-premium">{formatCurrency(revenue?.pipelineValue || 0)}</p>
                  <p className="text-xs text-muted-foreground">{revenue?.pipelineCount || 0} active</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Estimated at {PIPELINE_CONVERSION_RATE * 100}% conversion rate</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

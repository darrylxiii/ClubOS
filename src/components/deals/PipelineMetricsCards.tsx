import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePipelineMetrics, useDealPipeline } from "@/hooks/useDealPipeline";
import { useReferralPipelineMetrics } from "@/hooks/useReferralPipelineMetrics";
import { useMultiHirePipelineMetrics } from "@/hooks/useMultiHirePipelineMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Target, AlertCircle, Gift, Minus, Layers } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/format";

// Memoized metric card component
const MetricCard = memo(function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  color, 
  tooltip 
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
  color: string;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="cursor-help hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium truncate">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${color} shrink-0`} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{value}</div>
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
});

function PipelineMetricsCardsComponent() {
  const { data: metrics, isLoading: metricsLoading } = usePipelineMetrics();
  const { data: deals, isLoading: dealsLoading } = useDealPipeline();
  const { data: referralMetrics, isLoading: referralLoading } = useReferralPipelineMetrics();
  const { data: multiHireMetrics, isLoading: multiHireLoading } = useMultiHirePipelineMetrics();

  // Memoize expensive calculations
  const computedMetrics = useMemo(() => {
    if (!deals) return null;

    const dealsWithoutFee = deals.filter(deal => {
      const companies = deal.companies as any;
      return !companies?.placement_fee_percentage;
    }).length;

    const multiHireDeals = deals.filter(d => (d.target_hire_count || 1) > 1);
    const totalMultiHireValue = multiHireDeals.reduce((sum, d) => sum + (d.total_deal_value || 0), 0);
    const totalPositions = multiHireDeals.reduce((sum, d) => sum + (d.target_hire_count || 1), 0);
    const filledPositions = multiHireDeals.reduce((sum, d) => sum + (d.hired_count || 0), 0);

    return {
      dealsWithoutFee,
      multiHireDeals,
      totalMultiHireValue,
      totalPositions,
      filledPositions,
    };
  }, [deals]);

  // Memoize cards array
  const cards = useMemo(() => {
    if (!computedMetrics) return [];

    const { dealsWithoutFee, multiHireDeals, totalMultiHireValue, totalPositions, filledPositions } = computedMetrics;

    return [
      {
        title: "Gross Pipeline",
        value: formatCurrency(referralMetrics?.grossPipeline || metrics?.total_pipeline || 0),
        icon: DollarSign,
        description: `${referralMetrics?.dealCount || metrics?.deal_count || 0} active deals`,
        color: "text-info",
        tooltip: "Total expected revenue from all active deals"
      },
      {
        title: "Weighted Pipeline",
        value: formatCurrency(referralMetrics?.weightedGross || metrics?.weighted_pipeline || 0),
        icon: Target,
        description: "Probability-adjusted",
        color: "text-primary",
        tooltip: "Revenue adjusted by deal stage probability"
      },
      {
        title: "Multi-Hire Potential",
        value: formatCurrency(totalMultiHireValue),
        icon: Layers,
        description: `${multiHireDeals.length} roles · ${filledPositions}/${totalPositions} filled`,
        color: "text-blue-500",
        tooltip: `${multiHireDeals.length} volume hiring roles with ${totalPositions - filledPositions} positions remaining`
      },
      {
        title: "Referral Obligations",
        value: formatCurrency(referralMetrics?.referralObligations || 0),
        icon: Gift,
        description: "Projected payouts",
        color: "text-warning",
        tooltip: "Total projected referral fee payments to referrers"
      },
      {
        title: "Net Pipeline",
        value: formatCurrency(referralMetrics?.netPipeline || 0),
        icon: Minus,
        description: "After referral costs",
        color: "text-success",
        tooltip: "Gross pipeline minus referral obligations"
      },
      {
        title: "Config Status",
        value: dealsWithoutFee === 0 ? "Complete" : `${dealsWithoutFee} Missing`,
        icon: dealsWithoutFee === 0 ? Target : AlertCircle,
        description: dealsWithoutFee === 0 ? "All configured" : "Need fee setup",
        color: dealsWithoutFee === 0 ? "text-success" : "text-destructive",
        tooltip: dealsWithoutFee === 0 ? "All companies have fee configured" : `${dealsWithoutFee} companies need fee percentage setup`
      }
    ];
  }, [computedMetrics, metrics, referralMetrics]);

  if (metricsLoading || dealsLoading || referralLoading || multiHireLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>
    </TooltipProvider>
  );
}

export const PipelineMetricsCards = memo(PipelineMetricsCardsComponent);

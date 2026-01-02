import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePipelineMetrics, useDealPipeline } from "@/hooks/useDealPipeline";
import { useReferralPipelineMetrics } from "@/hooks/useReferralPipelineMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, Target, AlertCircle, Gift, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function PipelineMetricsCards() {
  const { data: metrics, isLoading: metricsLoading } = usePipelineMetrics();
  const { data: deals, isLoading: dealsLoading } = useDealPipeline();
  const { data: referralMetrics, isLoading: referralLoading } = useReferralPipelineMetrics();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (metricsLoading || dealsLoading || referralLoading) {
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

  // Calculate deals with missing fee configuration
  const dealsWithoutFee = deals?.filter(deal => {
    const companies = deal.companies as any;
    return !companies?.placement_fee_percentage;
  }).length || 0;

  const cards = [
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
      title: "Avg Deal Size",
      value: formatCurrency(metrics?.avg_deal_size || 0),
      icon: TrendingUp,
      description: "Per placement",
      color: "text-accent",
      tooltip: "Average revenue per deal placement"
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

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Tooltip key={card.title}>
              <TooltipTrigger asChild>
                <Card className="cursor-help hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium truncate">{card.title}</CardTitle>
                    <Icon className={`h-4 w-4 ${card.color} shrink-0`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold truncate">{card.value}</div>
                    <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>{card.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

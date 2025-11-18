import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePipelineMetrics, useDealPipeline } from "@/hooks/useDealPipeline";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, Target, AlertCircle } from "lucide-react";

export function PipelineMetricsCards() {
  const { data: metrics, isLoading: metricsLoading } = usePipelineMetrics();
  const { data: deals, isLoading: dealsLoading } = useDealPipeline();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (metricsLoading || dealsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-1" />
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
      title: "Total Pipeline",
      value: formatCurrency(metrics?.total_pipeline || 0),
      icon: DollarSign,
      description: `${metrics?.deal_count || 0} active deals`,
      color: "text-blue-500"
    },
    {
      title: "Weighted Pipeline",
      value: formatCurrency(metrics?.weighted_pipeline || 0),
      icon: Target,
      description: "Probability-adjusted revenue",
      color: "text-green-500"
    },
    {
      title: "Avg Deal Size",
      value: formatCurrency(metrics?.avg_deal_size || 0),
      icon: TrendingUp,
      description: "Per placement revenue",
      color: "text-purple-500"
    },
    {
      title: "Configuration Status",
      value: dealsWithoutFee === 0 ? "Complete" : `${dealsWithoutFee} Missing`,
      icon: dealsWithoutFee === 0 ? Target : AlertCircle,
      description: dealsWithoutFee === 0 ? "All fees configured" : "Companies need fee setup",
      color: dealsWithoutFee === 0 ? "text-green-500" : "text-destructive"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

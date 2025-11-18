import { Card } from "@/components/ui/card";
import { usePipelineMetrics } from "@/hooks/useDealPipeline";
import { TrendingUp, Target, Briefcase, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function PipelineMetricsCards() {
  const { data: metrics, isLoading } = usePipelineMetrics();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Weighted Pipeline",
      value: formatCurrency(metrics?.weighted_pipeline || 0),
      icon: Target,
      description: "Expected revenue based on probability",
      color: "text-primary",
    },
    {
      title: "Total Pipeline",
      value: formatCurrency(metrics?.total_pipeline || 0),
      icon: DollarSign,
      description: "Total potential revenue",
      color: "text-success",
    },
    {
      title: "Active Deals",
      value: metrics?.deal_count || 0,
      icon: Briefcase,
      description: "Currently in pipeline",
      color: "text-warning",
    },
    {
      title: "Avg Deal Size",
      value: formatCurrency(metrics?.avg_deal_size || 0),
      icon: TrendingUp,
      description: "Average deal value",
      color: "text-accent",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

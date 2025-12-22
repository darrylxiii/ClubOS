import { useUserMetrics } from "@/hooks/useUserMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual1 } from "@/components/ui/visual-1";
import { TrendingUp } from "lucide-react";

export const ActivityStatusCard = () => {
  const { metrics, isLoading } = useUserMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  // Mock trend data
  const trend = "+24.1%";

  return (
    <AnimatedCard>
      <CardVisual>
        <Visual1 mainColor="#10b981" secondaryColor="#059669" />
      </CardVisual>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardDescription>New Users (7d)</CardDescription>
            <CardTitle>{metrics.new_users_7d}</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Active growth this week
        </p>
        <div className="mt-3 inline-flex items-center px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="text-xs font-medium text-green-600 dark:text-green-400">Strong Growth</span>
        </div>
      </CardBody>
    </AnimatedCard>
  );
};


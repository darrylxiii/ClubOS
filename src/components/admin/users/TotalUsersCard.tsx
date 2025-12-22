import { useUserMetrics } from "@/hooks/useUserMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual1 } from "@/components/ui/visual-1";
import { TrendingUp } from "lucide-react";

export const TotalUsersCard = () => {
  const { metrics, isLoading } = useUserMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  const verificationRate = metrics.total_users > 0
    ? (metrics.verified_users / metrics.total_users) * 100
    : 0;

  // Mock trend data
  const trend = "+18.2%";

  return (
    <AnimatedCard>
      <CardVisual>
        <Visual1 mainColor="#3b82f6" secondaryColor="#8b5cf6" />
      </CardVisual>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardDescription>Total Users</CardDescription>
            <CardTitle>{metrics.total_users.toLocaleString()}</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {metrics.verified_users} verified • {metrics.pending_verification} pending
        </p>
        <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${verificationRate}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {verificationRate.toFixed(1)}% verified
        </p>
      </CardBody>
    </AnimatedCard>
  );
};


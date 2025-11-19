import { Shield } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";

export const RolesDistributionCard = () => {
  const { roleDistribution, isLoading } = useUserMetrics();

  if (isLoading || !roleDistribution) {
    return <MetricCardSkeleton />;
  }

  const totalRoleCount = roleDistribution.reduce((sum, role) => sum + Number(role.user_count), 0);

  return (
    <MetricCard
      title="Roles"
      description="Role distribution"
      icon={Shield}
      iconColor="success"
      primaryMetric={roleDistribution.length}
      secondaryText={`${totalRoleCount} users with roles`}
    >
      <div className="mt-4 pt-4 border-t space-y-1">
        {roleDistribution.slice(0, 4).map((role, idx) => (
          <div key={idx} className="flex justify-between text-xs">
            <span className="capitalize">{role.role}</span>
            <span className="text-muted-foreground">{role.user_count} users</span>
          </div>
        ))}
      </div>
    </MetricCard>
  );
};

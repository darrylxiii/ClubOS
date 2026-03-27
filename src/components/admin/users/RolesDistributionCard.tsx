import { useUserMetrics } from "@/hooks/useUserMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual3 } from "@/components/ui/visual-3";
import { TrendingUp } from "lucide-react";
import { useTranslation } from 'react-i18next';

export const RolesDistributionCard = () => {
  const { t } = useTranslation('admin');
  const { roleDistribution, isLoading } = useUserMetrics();

  if (isLoading) {
    return <MetricCardSkeleton />;
  }

  const safeRoles = roleDistribution || [];
  const totalRoleCount = safeRoles.reduce((sum, role) => sum + Number(role.user_count), 0);

  // Mock trend data
  const trend = "+5.3%";

  return (
    <AnimatedCard>
      <CardVisual>
        <Visual3 mainColor="#14b8a6" secondaryColor="#06b6d4" />
      </CardVisual>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardDescription>{t('users.rolesDistributionCard.roleDistribution')}</CardDescription>
            <CardTitle>{safeRoles.length}</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {totalRoleCount} users with roles
        </p>
        <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
          {safeRoles.slice(0, 3).map((role, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="capitalize text-foreground/80">{role.role}</span>
              <span className="text-muted-foreground font-medium">{role.user_count}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </AnimatedCard>
  );
};

import { useCompanyMetrics } from "@/hooks/useCompanyMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual3 } from "@/components/ui/visual-3";
import { TrendingUp } from "lucide-react";
import { useTranslation } from 'react-i18next';

export const TotalApplicationsCard = () => {
  const { t } = useTranslation('admin');
  const { metrics, isLoading } = useCompanyMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  // Mock trend data
  const trend = "+23.4%";

  return (
    <AnimatedCard>
      <CardVisual>
        <Visual3 mainColor="#f59e0b" secondaryColor="#ef4444" />
      </CardVisual>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardDescription>{t('companies.totalApplicationsCard.totalApplications')}</CardDescription>
            <CardTitle>{metrics.total_applications.toLocaleString()}</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Across all companies
        </p>
      </CardBody>
    </AnimatedCard>
  );
};


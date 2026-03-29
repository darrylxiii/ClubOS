import { useCompanyMetrics } from "@/hooks/useCompanyMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual1 } from "@/components/ui/visual-1";
import { TrendingUp } from "lucide-react";
import { useTranslation } from 'react-i18next';

export const TotalCompaniesCard = () => {
  const { t } = useTranslation('admin');
  const { metrics, isLoading } = useCompanyMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  const activeRate = metrics.total_companies > 0
    ? (metrics.active_companies / metrics.total_companies) * 100
    : 0;

  // Mock trend data
  const trend = "+12.5%";

  return (
    <AnimatedCard>
      <CardVisual>
        <Visual1 mainColor="#3b82f6" secondaryColor="#8b5cf6" />
      </CardVisual>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardDescription>{t('companies.totalCompaniesCard.totalCompanies')}</CardDescription>
            <CardTitle>{metrics.total_companies}</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {metrics.active_companies} {t('companies.totalCompaniesCard.active', 'active')} • {metrics.inactive_companies} {t('companies.totalCompaniesCard.inactive', 'inactive')}
        </p>
        <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${activeRate}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {activeRate.toFixed(1)}% {t('companies.totalCompaniesCard.activeRate', 'active rate')}
        </p>
      </CardBody>
    </AnimatedCard>
  );
};

